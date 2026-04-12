import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  encodeFunctionData,
  erc20Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { erc7710WalletActions } from "@metamask/smart-accounts-kit/actions";
import { connectDB } from "@/lib/db/mongoose";
import { Delegation, Strategy } from "@/lib/db/models";

const BACKEND_PK = process.env.BACKEND_PRIVATE_KEY as `0x${string}`;
const TANA_AUTO_DEPOSIT = process.env.TANA_AUTO_DEPOSIT as `0x${string}`;

// Chain configs for multi-chain support
const CHAIN_CONFIG: Record<number, { chain: typeof base; rpc: string }> = {
  8453: { chain: base, rpc: "https://mainnet.base.org" },
};

const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  8453: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
};

// TanaAutoDeposit ABI — only the functions we call from the backend
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

// POST /api/execute-strategy — called when an alpha moves funds
// Body: { strategyId, triggeredBy (alpha address) }
// POST /api/execute-strategy
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("x-tana-secret");
  if (authHeader !== process.env.TANA_RELAY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!BACKEND_PK || !TANA_AUTO_DEPOSIT) {
    return NextResponse.json({ error: "Backend config missing" }, { status: 500 });
  }

  await connectDB();
  const text = await req.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON", received: text }, { status: 400 });
  }
  const { strategyId } = body;

  const strategy = await Strategy.findById(strategyId).lean();
  if (!strategy) return NextResponse.json({ error: "Strategy not found" }, { status: 404 });

  const nowSec = Math.floor(Date.now() / 1000);
  const delegations = await Delegation.find({
    strategyId,
    isActive: true,
    expiry: { $gt: nowSec },
  }).lean();
  if (delegations.length === 0) {
    return NextResponse.json({ message: "No active followers" });
  }

  const backendAccount = privateKeyToAccount(BACKEND_PK);
  const results: { follower: string; txHash?: string; sweepHash?: string; error?: string }[] = [];

  // THE FIX: Fetch the nonce exactly ONCE before the loop starts
  // We will manage it manually in memory from here on out.
  const publicClientBase = createPublicClient({ chain: base, transport: http(CHAIN_CONFIG[8453].rpc) });
  let currentNonce = await publicClientBase.getTransactionCount({
    address: backendAccount.address,
    blockTag: "pending",
  });

  for (const delegation of delegations) {
    const chainId = delegation.chainId as number;
    const chainConf = CHAIN_CONFIG[chainId];
    if (!chainConf) {
      results.push({ follower: delegation.followerAddress, error: `Unsupported chain ${chainId}` });
      continue;
    }

    // Validate delegationManager is a valid hex address before using it
    if (!/^0x[0-9a-fA-F]{40}$/.test(delegation.delegationManager ?? "")) {
      results.push({ follower: delegation.followerAddress, error: "Invalid delegationManager address" });
      continue;
    }

    try {
      const usdcAddress = USDC_BY_CHAIN[chainId];
      const amountIn = parseUnits(String(delegation.amount ?? 100), 6);
      const follower = delegation.followerAddress as `0x${string}`;
      const vault = strategy.vaultAddress as `0x${string}`;

      const publicClient = createPublicClient({ chain: chainConf.chain, transport: http(chainConf.rpc) });
      const walletClient = createWalletClient({ account: backendAccount, chain: chainConf.chain, transport: http(chainConf.rpc) });
      const delegatedWalletClient = walletClient.extend(erc7710WalletActions());

      // Step 1: register follower→vault
      const currentVault = await publicClient.readContract({
        address: TANA_AUTO_DEPOSIT,
        abi: TANA_ABI,
        functionName: "followerVault",
        args: [follower],
      });

      if ((currentVault as string).toLowerCase() !== vault.toLowerCase()) {
        const setVaultData = encodeFunctionData({ abi: TANA_ABI, functionName: "setVault", args: [follower, vault] });
        const setVaultHash = await walletClient.sendTransaction({
          to: TANA_AUTO_DEPOSIT,
          data: setVaultData,
          value: 0n,
          nonce: currentNonce++, // <-- Pass and increment!
        });
        await publicClient.waitForTransactionReceipt({ hash: setVaultHash });
      }

      // Step 2: delegated USDC transfer
      const transferData = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [TANA_AUTO_DEPOSIT, amountIn] });
      const txHash = await delegatedWalletClient.sendTransactionWithDelegation({
        account: backendAccount,
        chain: chainConf.chain,
        to: usdcAddress,
        data: transferData,
        value: 0n,
        permissionContext: delegation.permissionContext as `0x${string}`,
        delegationManager: delegation.delegationManager as `0x${string}`,
        nonce: currentNonce++, // <-- Pass and increment!
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Step 3: sweep to ERC-4626 vault
      const sweepData = encodeFunctionData({ abi: TANA_ABI, functionName: "sweep", args: [follower, amountIn] });
      const sweepHash = await walletClient.sendTransaction({
        to: TANA_AUTO_DEPOSIT,
        data: sweepData,
        value: 0n,
        nonce: currentNonce++, // <-- Pass and increment!
      });
      await publicClient.waitForTransactionReceipt({ hash: sweepHash });

      await Delegation.findByIdAndUpdate(delegation._id, {
        lastExecutedAt: new Date(),
        $inc: { executionCount: 1 },
      });

      results.push({ follower: delegation.followerAddress, txHash, sweepHash });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ follower: delegation.followerAddress, error: msg });
    }
  }

  return NextResponse.json({ strategyId, executed: results.length, results });
}
