import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { base, mainnet, arbitrum, optimism, polygon } from "viem/chains";
import type { PortfolioPosition } from "@/types";
import fs from "fs";
import path from "path";

const EARN_BASE = "https://earn.li.fi";
const LIFI_API_KEY = process.env.LIFI_API_KEY ?? "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CHAIN_CLIENTS: Record<number, any> = {
  1: createPublicClient({ chain: mainnet, transport: http("https://eth.llamarpc.com") }),
  8453: createPublicClient({ chain: base, transport: http("https://mainnet.base.org") }),
  42161: createPublicClient({ chain: arbitrum, transport: http("https://arb1.arbitrum.io/rpc") }),
  10: createPublicClient({ chain: optimism, transport: http("https://mainnet.optimism.io") }),
  137: createPublicClient({ chain: polygon, transport: http("https://polygon-rpc.com") }),
};

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 137: "Polygon",
};

// LI.FI Earn API vault detail endpoint uses network name, not chainId
const CHAIN_ID_TO_NETWORK: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
  10: "Optimism",
  137: "Polygon",
  43114: "Avalanche",
  56: "BNB Chain",
  100: "Gnosis Chain",
  534352: "Scroll",
  59144: "Linea",
  5000: "Mantle",
};

const BALANCE_OF_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
] as const;

const CONVERT_ABI = [
  { name: "convertToAssets", type: "function", stateMutability: "view", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
] as const;

type VaultEntry = {
  address: string;
  chainId: number;
  chainName: string;
  protocol: string;
  name: string;
  asset: string;
  isStable: boolean;
  decimals: number;
  apy?: number;
  tvlUsd?: number;
};

function loadVaults(): VaultEntry[] {
  try {
    const filePath = path.join(process.cwd(), "app", "data", "vaults.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw).vaults ?? [];
  } catch {
    return [];
  }
}

const ALL_VAULTS: VaultEntry[] = loadVaults();

// Group vaults by chain for multicall batching
const VAULTS_BY_CHAIN: Record<number, VaultEntry[]> = {};
for (const v of ALL_VAULTS) {
  if (!VAULTS_BY_CHAIN[v.chainId]) VAULTS_BY_CHAIN[v.chainId] = [];
  VAULTS_BY_CHAIN[v.chainId].push(v);
}

const ASSET_DECIMALS: Record<string, number> = {
  USDC: 6, USDT: 6, DAI: 18, WETH: 18, ETH: 18, WBTC: 8,
};

async function scanChain(
  chainId: number,
  vaults: VaultEntry[],
  wallet: `0x${string}`
): Promise<PortfolioPosition[]> {
  const client = CHAIN_CLIENTS[chainId];
  if (!client) return [];

  // Single multicall: all balanceOf in one RPC round-trip
  const contracts = vaults.map((v) => ({
    address: v.address as `0x${string}`,
    abi: BALANCE_OF_ABI,
    functionName: "balanceOf" as const,
    args: [wallet] as [`0x${string}`],
  }));

  let results: { status: string; result?: bigint }[];
  try {
    results = await client.multicall({ contracts, allowFailure: true });
  } catch {
    return [];
  }

  // Collect vaults with non-zero balance
  const held: { vault: VaultEntry; balance: bigint }[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "success" && r.result && (r.result as bigint) > 0n) {
      held.push({ vault: vaults[i], balance: r.result as bigint });
    }
  }

  if (held.length === 0) return [];

  // Second multicall: convertToAssets for all held vaults
  const convertContracts = held.map(({ vault, balance }) => ({
    address: vault.address as `0x${string}`,
    abi: CONVERT_ABI,
    functionName: "convertToAssets" as const,
    args: [balance] as [bigint],
  }));

  let convertResults: { status: string; result?: bigint }[];
  try {
    convertResults = await client.multicall({ contracts: convertContracts, allowFailure: true });
  } catch {
    convertResults = held.map(() => ({ status: "failure" }));
  }

  return held.map(({ vault, balance }, i) => {
    const firstAsset = vault.asset.split("+")[0];
    const underlyingDecimals = ASSET_DECIMALS[firstAsset] ?? (vault.isStable ? 6 : 18);
    const shareDecimals = vault.decimals ?? 18;

    let balanceUsd = parseFloat(formatUnits(balance, shareDecimals));
    const cr = convertResults[i];
    if (cr.status === "success" && cr.result) {
      balanceUsd = parseFloat(formatUnits(cr.result as bigint, underlyingDecimals));
    }

    return {
      vaultAddress: vault.address,
      chainId,
      protocol: vault.protocol,
      asset: firstAsset,
      balance: balance.toString(),
      balanceUsd,
      apy: (vault.apy ?? 0) / 100,
      name: `${vault.name} — ${CHAIN_NAMES[chainId] ?? vault.chainName}`,
    };
  });
}

async function fetchOnChainPositions(walletAddress: string): Promise<PortfolioPosition[]> {
  const wallet = walletAddress as `0x${string}`;

  // One multicall per chain — all chains in parallel
  const chainResults = await Promise.allSettled(
    Object.entries(VAULTS_BY_CHAIN).map(([chainId, vaults]) =>
      scanChain(Number(chainId), vaults, wallet)
    )
  );

  const positions: PortfolioPosition[] = [];
  for (const r of chainResults) {
    if (r.status === "fulfilled") positions.push(...r.value);
  }

  // Enrich names + APY from LI.FI Earn for found positions
  if (positions.length > 0) {
    const headers: Record<string, string> = {};
    if (LIFI_API_KEY) headers["x-lifi-api-key"] = LIFI_API_KEY;

    await Promise.allSettled(
      positions.map(async (pos) => {
        try {
          const network = CHAIN_ID_TO_NETWORK[pos.chainId] ?? String(pos.chainId);
          const res = await fetch(
            `${EARN_BASE}/v1/earn/vaults/${network}/${pos.vaultAddress}`,
            { headers }
          );
          if (res.ok) {
            const v = await res.json();
            const rawApy = v.analytics?.apy?.total ?? 0;
            pos.apy = rawApy / 100;
            if (v.name) pos.name = `${v.name} — ${CHAIN_NAMES[pos.chainId]}`;
          }
        } catch { /* skip */ }
      })
    );
  }

  return positions.sort((a, b) => b.balanceUsd - a.balanceUsd);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  if (LIFI_API_KEY) headers["x-lifi-api-key"] = LIFI_API_KEY;

  try {
    // Try LI.FI portfolio API first (fast when indexed)
    const res = await fetch(
      `${EARN_BASE}/v1/earn/portfolio/${address}/positions`,
      { headers, next: { revalidate: 60 } }
    );

    if (res.ok) {
      const json = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = Array.isArray(json) ? json : (json.positions ?? json.data ?? []);

      if (raw.length > 0) {
        const positions: PortfolioPosition[] = raw.map((p) => ({
          vaultAddress: p.asset?.address ?? p.vaultAddress ?? "",
          chainId: p.chainId ?? 1,
          protocol: p.protocolName ?? p.protocol ?? "Unknown",
          asset: p.asset?.symbol ?? "USDC",
          balance: p.balanceNative ?? p.balance ?? "0",
          balanceUsd: parseFloat(p.balanceUsd ?? "0"),
          apy: p.apy ?? 0,
          name: p.name ?? `${p.protocolName ?? "Vault"} ${p.asset?.symbol ?? ""}`,
        }));
        return NextResponse.json(positions);
      }
    }
  } catch { /* fall through */ }

  // Fallback: multicall scan — 1 RPC call per chain (5 total)
  const onChain = await fetchOnChainPositions(address);
  return NextResponse.json(onChain);
}
