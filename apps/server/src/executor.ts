import axios from "axios";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  encodeFunctionData,
  erc20Abi,
  Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet, arbitrum } from "viem/chains";
import { erc7710WalletActions } from "@metamask/smart-accounts-kit/actions";
import { Delegation, ExecutionLog, Strategy } from "./models.js";
import { withLock } from "./nonce-mutex.js";
import { sendTelegramAlert } from "./telegram.js";

// Read lazily inside executeStrategy — module-level capture happens before dotenv runs
// because ES module static imports are hoisted ahead of index.ts body code.
function getEnv() {
  const BACKEND_PK = process.env.BACKEND_PRIVATE_KEY as `0x${string}`;
  const TANA_AUTO_DEPOSIT = process.env.TANA_AUTO_DEPOSIT as `0x${string}`;
  const LIFI_API_KEY = process.env.LIFI_API_KEY ?? "";
  if (!BACKEND_PK) throw new Error("BACKEND_PRIVATE_KEY is not set");
  if (!TANA_AUTO_DEPOSIT) throw new Error("TANA_AUTO_DEPOSIT is not set");
  return { BACKEND_PK, TANA_AUTO_DEPOSIT, LIFI_API_KEY };
}

const EARN_BASE = "https://earn.li.fi";

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

const TANA_ABI = [
  {
    type: "function",
    name: "setVault",
    inputs: [
      { name: "follower", type: "address" },
      { name: "vault", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sweep",
    inputs: [
      { name: "follower", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "followerVault",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

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
      throw new Error(`LI.FI API error: ${err.response?.status ?? 'network error'} - ${err.message}`);
    }
    throw err;
  }
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
  positionAfter?: {
    balanceUsd: string;
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
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    const now = Math.floor(Date.now() / 1000);
    const delegationFilter: Record<string, unknown> = {
      strategyId,
      isActive: true,
      expiry: { $gt: now },
    };

    // Only execute followers who haven't run since last trigger
    if (lastTriggeredAt) {
      delegationFilter.$or = [
        { lastExecutedAt: null },
        { lastExecutedAt: { $lt: lastTriggeredAt } },
      ];
    }

    const delegations = await Delegation.find(delegationFilter).lean();

    console.log(`[Executor] Found ${delegations.length} delegations for strategy ${strategyId}`);
    for (const d of delegations) {
      const pc = d.permissionContext as string;
      const dm = d.delegationManager as string;
      console.log(`[Executor]   delegation: follower=${d.followerAddress}, expiry=${d.expiry}, amount=${d.amount}, permissionContext="${pc}", delegationManager="${dm}"`);
    }

    if (delegations.length === 0) {
      console.log(`[Executor] No active delegations for strategy ${strategyId}`);
      return [];
    }

    const { BACKEND_PK, TANA_AUTO_DEPOSIT, LIFI_API_KEY } = getEnv();
    const backendAccount = privateKeyToAccount(BACKEND_PK);
    const chainId = strategy.chainId as number;
    const chainConf = CHAIN_CONFIG[chainId];
    if (!chainConf) {
      throw new Error(`Unsupported chain ${chainId}`);
    }

    const results: ExecutionResult[] = [];

    const publicClientBase = createPublicClient({
      chain: chainConf.chain,
      transport: http(chainConf.rpc),
    });

    let currentNonce = await publicClientBase.getTransactionCount({
      address: backendAccount.address,
      blockTag: "pending",
    });

    // ── Log relayer balance ───────────────────────────────────────────────
    const relayerBalance = await publicClientBase.getBalance({ address: backendAccount.address });
    console.log(`[Executor] Relayer ${backendAccount.address} balance on chain ${chainId}: ${relayerBalance} wei (${Number(relayerBalance) / 1e18} ETH), nonce=${currentNonce}`);

    // ── Fetch live vault data from LI.FI Earn ────────────────────────────
    let vaultDetail: Record<string, unknown> = {};
    try {
      console.log(`[Executor] Fetching vault detail for ${strategy.vaultAddress} on chain ${chainId}`);
      vaultDetail = await fetchVaultDetail(chainId, strategy.vaultAddress as string, LIFI_API_KEY);
      console.log(`[Executor] Vault detail fetched: ${JSON.stringify(vaultDetail).slice(0, 200)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Executor] Could not fetch LI.FI vault detail: ${msg}`);
    }

    const vaultAnalytics = vaultDetail?.analytics as { apy?: { total?: number }; tvl?: { usd?: number } } | undefined;
    const liveApy = vaultAnalytics?.apy?.total ?? (strategy.apy as number);
    const liveTvl = vaultAnalytics?.tvl?.usd ?? (strategy.tvlUsd as number);

    // Update strategy with live data
    await Strategy.findByIdAndUpdate(strategyId, {
      apy: liveApy,
      tvlUsd: liveTvl,
    });

    for (const delegation of delegations) {
      const follower = (delegation.followerAddress ?? "") as `0x${string}`;
      if (!follower) {
        console.error(`[Executor] Skipping delegation with no followerAddress: ${JSON.stringify(delegation)}`);
        continue;
      }

      // Validate delegation data
      const permissionContext = delegation.permissionContext as string;
      const delegationManager = delegation.delegationManager as string;
      
      if (!permissionContext || permissionContext === "set" || !permissionContext.startsWith("0x")) {
        console.error(`[Executor] Invalid permissionContext for ${follower}: ${permissionContext}`);
        results.push({
          follower,
          status: "failed",
          error: `Invalid permissionContext: ${permissionContext}`,
        });
        continue;
      }
      
      if (!delegationManager || !delegationManager.startsWith("0x")) {
        console.error(`[Executor] Invalid delegationManager for ${follower}: ${delegationManager}`);
        results.push({
          follower,
          status: "failed",
          error: `Invalid delegationManager: ${delegationManager}`,
        });
        continue;
      }

      // Check expiry
      if (delegation.expiry < Math.floor(Date.now() / 1000)) {
        await Delegation.findByIdAndUpdate(delegation._id, { isActive: false });
        results.push({
          follower,
          status: "failed",
          error: "Delegation expired",
        });
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

        const publicClient = createPublicClient({
          chain: chainConf.chain,
          transport: http(chainConf.rpc),
        });

        const walletClient = createWalletClient({
          account: backendAccount,
          chain: chainConf.chain,
          transport: http(chainConf.rpc),
        });

        const delegatedWalletClient = walletClient.extend(erc7710WalletActions());

        // ── Step 1: setVault ──────────────────────────────────────────────
        const currentVault = (await publicClient.readContract({
          address: TANA_AUTO_DEPOSIT,
          abi: TANA_ABI,
          functionName: "followerVault",
          args: [follower],
        })) as string;

        let setVaultHash: `0x${string}` | undefined;
        if (currentVault.toLowerCase() !== vault.toLowerCase()) {
          const setVaultData = encodeFunctionData({
            abi: TANA_ABI,
            functionName: "setVault",
            args: [follower, vault],
          });
          setVaultHash = await walletClient.sendTransaction({
            to: TANA_AUTO_DEPOSIT,
            data: setVaultData,
            value: 0n,
            nonce: currentNonce++,
          });
          await publicClient.waitForTransactionReceipt({ hash: setVaultHash });
        }

        // ── Step 2: Delegated USDC Transfer ────────────────────────────────
        // Pre-flight: check follower's USDC balance
        const followerUsdcBalance = await publicClient.readContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [follower],
        }) as bigint;
        console.log(`[Executor] Follower ${follower} USDC balance: ${followerUsdcBalance} (need ${amountIn})`);
        if (followerUsdcBalance < amountIn) {
          throw new Error(`Follower has insufficient USDC: has ${followerUsdcBalance}, needs ${amountIn}`);
        }

        const transferData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [TANA_AUTO_DEPOSIT, amountIn],
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
          const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
          console.log(`[Executor] Delegation tx ${txHash} status: ${transferReceipt.status}`);
          if (transferReceipt.status === "reverted") {
            currentNonce = await publicClientBase.getTransactionCount({
              address: backendAccount.address,
              blockTag: "pending",
            });
            throw new Error(`Delegated USDC transfer reverted (tx: ${txHash})`);
          }
        } catch (delegationErr) {
          // Re-fetch nonce on failure
          currentNonce = await publicClientBase.getTransactionCount({
            address: backendAccount.address,
            blockTag: "pending",
          });
          throw delegationErr;
        }

        // ── Step 3: Sweep ────────────────────────────────────────────────
        const sweepData = encodeFunctionData({
          abi: TANA_ABI,
          functionName: "sweep",
          args: [follower, amountIn],
        });
        const sweepHash = await walletClient.sendTransaction({
          to: TANA_AUTO_DEPOSIT,
          data: sweepData,
          value: 0n,
          nonce: currentNonce++,
        });
        await publicClient.waitForTransactionReceipt({ hash: sweepHash });

        // ── Update delegation ─────────────────────────────────────────────
        await Delegation.findByIdAndUpdate(delegation._id, {
          lastExecutedAt: new Date(),
          $inc: { executionCount: 1 },
        });

        // ── Create ExecutionLog ───────────────────────────────────────────
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

        // ── Send Telegram Alert ───────────────────────────────────────────
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

        // Log failure
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
