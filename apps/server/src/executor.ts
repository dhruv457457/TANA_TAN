import axios from "axios";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  encodeFunctionData,
  erc20Abi,
  Chain,
  maxUint256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet, arbitrum } from "viem/chains";
import { erc7710WalletActions } from "@metamask/smart-accounts-kit/actions";
import { Delegation, ExecutionLog, Strategy } from "./models.js";
import { withLock } from "./nonce-mutex.js";
import { sendTelegramAlert } from "./telegram.js";

// Read lazily inside executeStrategy — module-level capture happens before dotenv runs
function getEnv() {
  const BACKEND_PK = process.env.BACKEND_PRIVATE_KEY as `0x${string}`;
  const LIFI_API_KEY = process.env.LIFI_API_KEY;
  if (!BACKEND_PK) throw new Error("BACKEND_PRIVATE_KEY is not set");
  if (!LIFI_API_KEY) throw new Error("LIFI_API_KEY is required");
  return { BACKEND_PK, LIFI_API_KEY };
}

const EARN_BASE = "https://earn.li.fi";
const COMPOSER_BASE = "https://li.quest";

const CHAIN_CONFIG: Record<number, { chain: Chain; rpc: string; name: string }> = {
  8453: { chain: base, rpc: "https://mainnet.base.org", name: "Base" },
  1: { chain: { ...mainnet, blockExplorers: undefined } as Chain, rpc: "https://eth.llamarpc.com", name: "Ethereum" },
  42161: { chain: { ...arbitrum, blockExplorers: undefined } as Chain, rpc: "https://arb1.arbitrum.io/rpc", name: "Arbitrum" },
};

const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  8453: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  1: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};

const earnClient = axios.create({ baseURL: EARN_BASE, timeout: 10000 });

async function fetchVaultDetail(chainId: number, address: string, lifiApiKey: string) {
  try {
    const { data } = await earnClient.get("/v1/earn/vaults", {
      params: { chainId },
      headers: lifiApiKey ? { "x-lifi-api-key": lifiApiKey } : {},
    });
    const vaults = Array.isArray(data) ? data : (data?.data ?? []);
    if (!Array.isArray(vaults) || !vaults.length) {
      throw new Error(`No vaults found on chain ${chainId}`);
    }
    const vault = vaults.find(
      (v: { address?: string }) => v.address?.toLowerCase() === address.toLowerCase()
    );
    if (!vault) {
      throw new Error(`Vault ${address} not found on chain ${chainId}`);
    }
    return vault;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      throw new Error(`LI.FI API error: ${err.response?.status ?? "network error"} - ${err.message}`);
    }
    throw err;
  }
}

/**
 * Get a LiFi Composer quote for depositing USDC into a vault.
 * toAddress = follower so vault shares are minted directly to follower.
 */
async function getLiFiQuote(params: {
  chainId: number;
  usdcAddress: `0x${string}`;
  vaultAddress: `0x${string}`;
  fromAddress: `0x${string}`;
  toAddress: `0x${string}`;
  amountIn: bigint;
  lifiApiKey: string;
}): Promise<{ to: `0x${string}`; data: `0x${string}`; value: bigint; approvalAddress?: `0x${string}` }> {
  const { chainId, usdcAddress, vaultAddress, fromAddress, toAddress, amountIn, lifiApiKey } = params;

  const qs = new URLSearchParams({
    fromChain: String(chainId),
    toChain: String(chainId),
    fromToken: usdcAddress,
    toToken: vaultAddress,
    fromAddress,
    toAddress,
    fromAmount: amountIn.toString(),
  });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (lifiApiKey) headers["x-lifi-api-key"] = lifiApiKey;

  const res = await fetch(`${COMPOSER_BASE}/v1/quote?${qs}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LiFi Composer quote failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const quote = await res.json() as {
    transactionRequest?: { to?: string; data?: string; value?: string };
    action?: { fromToken?: string };
  };

  if (!quote?.transactionRequest?.to) {
    throw new Error(`LiFi quote missing transactionRequest: ${JSON.stringify(quote).slice(0, 300)}`);
  }

  return {
    to: quote.transactionRequest.to as `0x${string}`,
    data: quote.transactionRequest.data as `0x${string}`,
    value: BigInt(quote.transactionRequest.value ?? "0"),
    // The contract to approve USDC for — usually quote.transactionRequest.to
    approvalAddress: (quote.action?.fromToken ? quote.transactionRequest.to : undefined) as `0x${string}` | undefined,
  };
}

export interface ExecutionResult {
  follower: string;
  txHash?: string;
  sweepHash?: string;
  error?: string;
  status: "success" | "failed";
  vault?: {
    name: string;
    protocol: string;
    apy: number;
    tvl: number;
    tags: string[];
    isTransactional: boolean;
    isRedeemable: boolean;
    verifiedByLiFi: boolean;
  };
}

export async function executeStrategy(
  strategyId: string,
  executorAddress: string,
  lastTriggeredAt?: Date
): Promise<ExecutionResult[]> {
  const mutexKey = `executor:${executorAddress}`;

  return withLock(mutexKey, async () => {
    const strategy = await Strategy.findById(strategyId).lean();
    if (!strategy) throw new Error(`Strategy ${strategyId} not found`);

    const now = Math.floor(Date.now() / 1000);

    // Execute delegations that are due:
    //   - never run before (lastExecutedAt: null), OR
    //   - last ran before the most recent alpha trigger (re-copy on re-trigger)
    const delegationQuery: Record<string, unknown> = {
      strategyId,
      isActive: true,
      expiry: { $gt: now },
    };
    if (lastTriggeredAt) {
      delegationQuery.$or = [
        { lastExecutedAt: null },
        { lastExecutedAt: { $lt: lastTriggeredAt } },
      ];
    } else {
      delegationQuery.lastExecutedAt = null;
    }
    const delegations = await Delegation.find(delegationQuery).lean();
    console.log(`[Executor] Found ${delegations.length} delegations for strategy ${strategyId}`);

    for (const d of delegations) {
      console.log(
        `[Executor]   delegation: follower=${d.followerAddress}, expiry=${d.expiry}, amount=${d.amount}, ` +
        `permissionContext="${(d.permissionContext as string).slice(0, 60)}…", delegationManager="${d.delegationManager}"`
      );
    }

    if (delegations.length === 0) {
      console.log(`[Executor] No active delegations for strategy ${strategyId}`);
      return [];
    }

    const { BACKEND_PK, LIFI_API_KEY } = getEnv();
    const backendAccount = privateKeyToAccount(BACKEND_PK);
    const chainId = strategy.chainId as number;
    const chainConf = CHAIN_CONFIG[chainId];
    if (!chainConf) throw new Error(`Unsupported chain ${chainId}`);

    const publicClientBase = createPublicClient({
      chain: chainConf.chain,
      transport: http(chainConf.rpc),
    });

    let currentNonce = await publicClientBase.getTransactionCount({
      address: backendAccount.address,
      blockTag: "pending",
    });

    const relayerBalance = await publicClientBase.getBalance({ address: backendAccount.address });
    console.log(
      `[Executor] Relayer ${backendAccount.address} balance on chain ${chainId}: ` +
      `${relayerBalance} wei (${Number(relayerBalance) / 1e18} ETH), nonce=${currentNonce}`
    );

    // ── Fetch live vault data from LI.FI Earn ────────────────────────────
    let vaultDetail: Record<string, unknown> = {};
    try {
      console.log(`[Executor] Fetching vault detail for ${strategy.vaultAddress} on chain ${chainId}`);
      vaultDetail = await fetchVaultDetail(chainId, strategy.vaultAddress as string, LIFI_API_KEY);
      console.log(`[Executor] Vault detail fetched: ${JSON.stringify(vaultDetail).slice(0, 200)}`);
    } catch (err) {
      console.warn(`[Executor] Could not fetch LI.FI vault detail: ${err instanceof Error ? err.message : err}`);
    }

    const vaultAnalytics = vaultDetail?.analytics as
      | { apy?: { total?: number }; tvl?: { usd?: number } }
      | undefined;
    const rawApy = vaultAnalytics?.apy?.total ?? (strategy.apy as number) ?? 0;
    const liveApy = rawApy > 1 ? rawApy / 100 : rawApy;
    const liveTvl = vaultAnalytics?.tvl?.usd ?? (strategy.tvlUsd as number) ?? 0;

    await Strategy.findByIdAndUpdate(strategyId, { apy: liveApy, tvlUsd: liveTvl });

    const results: ExecutionResult[] = [];

    for (const delegation of delegations) {
      const follower = (delegation.followerAddress ?? "") as `0x${string}`;
      if (!follower) continue;

      const permissionContext = delegation.permissionContext as string;
      const delegationManager = delegation.delegationManager as string;

      if (!permissionContext || !permissionContext.startsWith("0x")) {
        console.error(`[Executor] Invalid permissionContext for ${follower}`);
        results.push({ follower, status: "failed", error: "Invalid permissionContext" });
        continue;
      }
      if (!delegationManager || !delegationManager.startsWith("0x")) {
        console.error(`[Executor] Invalid delegationManager for ${follower}`);
        results.push({ follower, status: "failed", error: "Invalid delegationManager" });
        continue;
      }
      if (delegation.expiry < now) {
        await Delegation.findByIdAndUpdate(delegation._id, { isActive: false });
        results.push({ follower, status: "failed", error: "Delegation expired" });
        continue;
      }

      try {
        const usdcAddress = USDC_BY_CHAIN[chainId];
        if (!usdcAddress) {
          results.push({ follower, status: "failed", error: `No USDC for chain ${chainId}` });
          continue;
        }

        const amountIn = parseUnits(String(delegation.amount ?? 100), 6);
        const vault = strategy.vaultAddress as `0x${string}`;

        const publicClient = createPublicClient({ chain: chainConf.chain, transport: http(chainConf.rpc) });
        const walletClient = createWalletClient({
          account: backendAccount,
          chain: chainConf.chain,
          transport: http(chainConf.rpc),
        });
        const delegatedWalletClient = walletClient.extend(erc7710WalletActions());

        // ── Pre-flight: check follower USDC balance ───────────────────────
        const followerUsdcBalance = (await publicClient.readContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [follower],
        })) as bigint;
        console.log(`[Executor] Follower ${follower} USDC balance: ${followerUsdcBalance} (need ${amountIn})`);
        if (followerUsdcBalance < amountIn) {
          // Not enough USDC yet — skip silently. Do NOT log to DB or Telegram;
          // lastExecutedAt stays null so the poller will retry automatically
          // once the follower funds their smart account.
          const humanHas = Number(followerUsdcBalance) / 1e6;
          const humanNeeds = Number(amountIn) / 1e6;
          console.warn(
            `[Executor] Skipping ${follower}: insufficient USDC ` +
            `(has $${humanHas.toFixed(4)}, needs $${humanNeeds.toFixed(4)}). ` +
            `Will retry next poll once funded.`
          );
          results.push({ follower, status: "failed", error: `Insufficient USDC — fund smart account with ≥ $${humanNeeds} USDC` });
          continue;
        }

        // ── Step 1: Delegated USDC transfer — follower → relayer ──────────
        // The ERC-7710 delegation allows USDC.transfer(anyone, ≤ period limit).
        // We transfer to the relayer so it can deposit via LiFi Composer.
        console.log(`[Executor] Step 1: Delegated transfer ${amountIn} USDC from ${follower} to relayer`);
        const transferData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [backendAccount.address, amountIn],   // ← to relayer, NOT TanaAutoDeposit
        });

        let txHash: `0x${string}` | undefined;
        try {
          txHash = await delegatedWalletClient.sendTransactionWithDelegation({
            account: backendAccount,
            chain: chainConf.chain,
            to: usdcAddress,
            data: transferData,
            value: 0n,
            permissionContext: permissionContext as `0x${string}`,
            delegationManager: delegationManager as `0x${string}`,
            nonce: currentNonce++,
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
          console.log(`[Executor] Delegation tx ${txHash} status: ${receipt.status}`);
          if (receipt.status === "reverted") {
            currentNonce = await publicClientBase.getTransactionCount({
              address: backendAccount.address, blockTag: "pending",
            });
            throw new Error(`Delegated USDC transfer reverted (tx: ${txHash})`);
          }
        } catch (err) {
          currentNonce = await publicClientBase.getTransactionCount({
            address: backendAccount.address, blockTag: "pending",
          });
          throw err;
        }

        // ── Step 2: Approve LiFi + deposit via Composer ──────────────────
        // LiFi handles ANY vault type (Aave, Morpho, etc.) — no ERC-4626 assumption.
        // Shares are minted directly to follower (toAddress = follower).
        console.log(`[Executor] Step 2: Getting LiFi Composer quote for vault ${vault}`);
        const lifiQuote = await getLiFiQuote({
          chainId,
          usdcAddress,
          vaultAddress: vault,
          fromAddress: backendAccount.address,
          toAddress: follower,
          amountIn,
          lifiApiKey: LIFI_API_KEY,
        });
        console.log(`[Executor] LiFi quote: to=${lifiQuote.to}, value=${lifiQuote.value}`);

        // Approve LiFi Diamond to spend relayer's USDC
        const currentAllowance = (await publicClient.readContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [backendAccount.address, lifiQuote.to],
        })) as bigint;

        if (currentAllowance < amountIn) {
          console.log(`[Executor] Approving ${lifiQuote.to} to spend USDC`);
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [lifiQuote.to, maxUint256],
          });
          const approveHash = await walletClient.sendTransaction({
            to: usdcAddress,
            data: approveData,
            value: 0n,
            nonce: currentNonce++,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log(`[Executor] USDC approval confirmed`);
        }

        // Execute the LiFi deposit tx — shares go to follower
        const sweepHash = await walletClient.sendTransaction({
          to: lifiQuote.to,
          data: lifiQuote.data,
          value: lifiQuote.value,
          nonce: currentNonce++,
        });
        const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: sweepHash });
        console.log(`[Executor] LiFi deposit tx ${sweepHash} status: ${depositReceipt.status}`);
        if (depositReceipt.status === "reverted") {
          throw new Error(`LiFi deposit reverted (tx: ${sweepHash})`);
        }

        // ── Update delegation & log ───────────────────────────────────────
        await Delegation.findByIdAndUpdate(delegation._id, {
          lastExecutedAt: new Date(),
          $inc: { executionCount: 1 },
        });

        await ExecutionLog.create({
          delegationId: delegation._id,
          strategyId,
          followerAddress: follower,
          txHash: txHash ?? "",
          sweepHash,
          amount: delegation.amount ?? 100,
          vaultAddress: vault,
          chainId,
          status: "success",
          executedAt: new Date(),
        });

        await sendTelegramAlert({
          follower,
          vaultName: (vaultDetail?.name as string) || (strategy.vaultName as string),
          protocol: (vaultDetail?.protocol as string) || (strategy.protocol as string),
          amount: delegation.amount ?? 100,
          apy: liveApy,
          txHash: txHash ?? "",
          sweepHash,
          chainName: chainConf.name,
          status: "success",
        });

        results.push({
          follower,
          txHash,
          sweepHash,
          status: "success",
          vault: {
            name: (vaultDetail?.name as string) || (strategy.vaultName as string),
            protocol: (vaultDetail?.protocol as string) || (strategy.protocol as string),
            apy: liveApy,
            tvl: liveTvl,
            tags: (vaultDetail?.tags as string[]) || [],
            isTransactional: vaultDetail?.isTransactional !== false,
            isRedeemable: vaultDetail?.isRedeemable === true,
            verifiedByLiFi: true,
          },
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Executor] Failed for ${follower}:`, msg);

        currentNonce = await publicClientBase.getTransactionCount({
          address: backendAccount.address, blockTag: "pending",
        });

        await ExecutionLog.create({
          delegationId: delegation._id,
          strategyId,
          followerAddress: follower,
          amount: delegation.amount ?? 100,
          vaultAddress: strategy.vaultAddress,
          chainId,
          status: "failed",
          error: msg,
          executedAt: new Date(),
        });

        await sendTelegramAlert({
          follower,
          vaultName: (strategy.vaultName as string) || (strategy.protocol as string),
          protocol: strategy.protocol as string,
          amount: delegation.amount ?? 100,
          apy: liveApy,
          txHash: "",
          sweepHash: "",
          chainName: chainConf.name,
          status: "failed",
          error: msg,
        });

        results.push({ follower, status: "failed", error: msg });
      }
    }

    return results;
  });
}
