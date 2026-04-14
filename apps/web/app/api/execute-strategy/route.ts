import { NextRequest, NextResponse } from "next/server";
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
import { connectDB } from "@/lib/db/mongoose";
import { Delegation, ExecutionLog, Strategy } from "@/lib/db/models";
import { fetchVaultDetail } from "@/lib/lifi";

const BACKEND_PK = process.env.BACKEND_PRIVATE_KEY as `0x${string}`;
const TANA_AUTO_DEPOSIT = process.env.TANA_AUTO_DEPOSIT as `0x${string}`;
const LIFI_API_KEY = process.env.LIFI_API_KEY;
if (!LIFI_API_KEY) throw new Error("LIFI_API_KEY is required");
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";

const CHAIN_CONFIG: Record<number, { chain: Chain; rpc: string; name: string }> = {
  8453: { chain: base, rpc: "https://mainnet.base.org", name: "Base" },
  1: { chain: mainnet, rpc: "https://eth.llamarpc.com", name: "Ethereum" },
  42161: { chain: arbitrum, rpc: "https://arb1.arbitrum.io/rpc", name: "Arbitrum" },
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

async function sendTelegramAlert(params: {
  follower: string;
  vaultName: string;
  protocol: string;
  amount: number;
  apy: number;
  txHash: string;
  sweepHash: string;
  chainName: string;
  status: "success" | "failed";
  error?: string;
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const { follower, vaultName, protocol, amount, apy, sweepHash, chainName, status, error } = params;
  const emoji = status === "success" ? "✅" : "❌";

  const text = `${emoji} *Copy-Trade ${status === "success" ? "Executed" : "Failed"}*

*Strategy:* ${vaultName}
*Protocol:* ${protocol}
*Amount:* $${amount} USDC
*APY:* ${(apy * 100).toFixed(2)}%
*Chain:* ${chainName}
*TX:* \`${sweepHash || "N/A"}\`
${error ? `*Error:* ${error}` : ""}
_${follower.slice(0, 6)}…${follower.slice(-4)}_`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }),
    });
  } catch {
    // silently fail
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("x-tana-secret");
  if (authHeader !== process.env.TANA_RELAY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!BACKEND_PK || !TANA_AUTO_DEPOSIT) {
    return NextResponse.json({ error: "Backend config missing" }, { status: 500 });
  }

  await connectDB();

  let body: { strategyId?: string };
  try {
    body = await req.json();
  } catch {
    const text = await req.text();
    return NextResponse.json({ error: "Invalid JSON", received: text }, { status: 400 });
  }

  const { strategyId } = body;
  if (!strategyId) {
    return NextResponse.json({ error: "strategyId required" }, { status: 400 });
  }

  const strategy = await Strategy.findById(strategyId).lean();
  if (!strategy) {
    return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
  }

  const chainId = strategy.chainId as number;
  const chainConf = CHAIN_CONFIG[chainId];
  if (!chainConf) {
    return NextResponse.json({ error: `Unsupported chain ${chainId}` }, { status: 400 });
  }

  // Mark strategy as triggered — poller will execute all pending followers
  const triggerTime = new Date();
  await Strategy.findByIdAndUpdate(strategyId, { lastTriggeredAt: triggerTime });

  const nowSec = Math.floor(Date.now() / 1000);
  const delegations = await Delegation.find({
    strategyId,
    isActive: true,
    expiry: { $gt: nowSec },
    $or: [
      { lastExecutedAt: null },
      { lastExecutedAt: { $lt: triggerTime } },
    ],
  }).lean();

  if (delegations.length === 0) {
    return NextResponse.json({ message: "No active followers" });
  }

  const backendAccount = privateKeyToAccount(BACKEND_PK);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let vaultDetail: any = {};
  try {
    vaultDetail = await fetchVaultDetail(chainId, strategy.vaultAddress as string);
  } catch {
    // proceed without LI.FI data
  }

  const liveApy = ((vaultDetail?.analytics as { apy?: { total?: number } })?.apy?.total ?? (strategy.apy as number));
  const liveTvl = ((vaultDetail?.analytics as { tvl?: { usd?: number } })?.tvl?.usd ?? (strategy.tvlUsd as number));

  await Strategy.findByIdAndUpdate(strategyId, {
    apy: liveApy,
    tvlUsd: liveTvl,
  });

  // ── Fetch nonce ───────────────────────────────────────────────────────────
  const publicClientBase = createPublicClient({ chain: chainConf.chain, transport: http(chainConf.rpc) });
  let currentNonce = await publicClientBase.getTransactionCount({
    address: backendAccount.address,
    blockTag: "pending",
  });

  const results: {
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
  }[] = [];

  for (const delegation of delegations) {
    const follower = delegation.followerAddress as `0x${string}`;

    if (!/^0x[0-9a-fA-F]{40}$/.test(delegation.delegationManager ?? "")) {
      results.push({ follower, status: "failed", error: "Invalid delegationManager address" });
      continue;
    }

    try {
      const usdcAddress = USDC_BY_CHAIN[chainId];
      const amountIn = parseUnits(String(delegation.amount ?? 100), 6);
      const vault = strategy.vaultAddress as `0x${string}`;

      // ── LI.FI Earn: Validate vault is open for deposits ───────────────────
      if (vaultDetail && vaultDetail.isTransactional === false) {
        throw new Error("Vault not available for deposits");
      }

      const publicClient = createPublicClient({ chain: chainConf.chain, transport: http(chainConf.rpc) });
      const walletClient = createWalletClient({
        account: backendAccount,
        chain: chainConf.chain,
        transport: http(chainConf.rpc),
      });
      const delegatedWalletClient = walletClient.extend(erc7710WalletActions());

      // Step 1: setVault
      const currentVault = (await publicClient.readContract({
        address: TANA_AUTO_DEPOSIT,
        abi: TANA_ABI,
        functionName: "followerVault",
        args: [follower],
      })) as string;

      if (currentVault.toLowerCase() !== vault.toLowerCase()) {
        const setVaultData = encodeFunctionData({
          abi: TANA_ABI,
          functionName: "setVault",
          args: [follower, vault],
        });
        const setVaultHash = await walletClient.sendTransaction({
          to: TANA_AUTO_DEPOSIT,
          data: setVaultData,
          value: 0n,
          nonce: currentNonce++,
        });
        await publicClient.waitForTransactionReceipt({ hash: setVaultHash });
      }

      // Step 2: Delegated USDC Transfer
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [TANA_AUTO_DEPOSIT, amountIn],
      });
      const txHash = await delegatedWalletClient.sendTransactionWithDelegation({
        account: backendAccount,
        chain: chainConf.chain,
        to: usdcAddress,
        data: transferData,
        value: 0n,
        permissionContext: delegation.permissionContext as `0x${string}`,
        delegationManager: delegation.delegationManager as `0x${string}`,
        nonce: currentNonce++,
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Step 3: Sweep to vault
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

      // Update delegation
      await Delegation.findByIdAndUpdate(delegation._id, {
        lastExecutedAt: new Date(),
        $inc: { executionCount: 1 },
      });

      // Create ExecutionLog
      await ExecutionLog.create({
        delegationId: delegation._id,
        strategyId,
        followerAddress: follower,
        txHash,
        sweepHash,
        amount: delegation.amount ?? 100,
        vaultAddress: vault,
        chainId,
        status: "success",
        executedAt: new Date(),
      });

      // Send Telegram alert
      await sendTelegramAlert({
        follower,
        vaultName: (vaultDetail?.name as string) || (strategy.vaultName as string),
        protocol: (vaultDetail?.protocol as string) || (strategy.protocol as string),
        amount: delegation.amount ?? 100,
        apy: liveApy,
        txHash,
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

      // On tx failure, re-fetch nonce before continuing
      currentNonce = await publicClientBase.getTransactionCount({
        address: backendAccount.address,
        blockTag: "pending",
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

  return NextResponse.json({
    strategyId,
    executed: results.filter((r) => r.status === "success").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}
