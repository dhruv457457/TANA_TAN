import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { base, mainnet, arbitrum, optimism, polygon } from "viem/chains";
import type { PortfolioPosition } from "@/types";

const EARN_BASE = "https://earn.li.fi";
const LIFI_API_KEY = process.env.LIFI_API_KEY ?? "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CHAIN_CLIENTS: Record<number, any> = {
  1: createPublicClient({ chain: mainnet, transport: http("https://cloudflare-eth.com") }),
  8453: createPublicClient({ chain: base, transport: http("https://mainnet.base.org") }),
  42161: createPublicClient({ chain: arbitrum, transport: http("https://arb1.arbitrum.io/rpc") }),
  10: createPublicClient({ chain: optimism, transport: http("https://mainnet.optimism.io") }),
  137: createPublicClient({ chain: polygon, transport: http("https://polygon-rpc.com") }),
};

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 137: "Polygon",
};

const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { name: "convertToAssets", type: "function", stateMutability: "view", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
] as const;

// Well-known vault LP token addresses to scan (fast — only ~15 contracts)
// These are the most common vaults users deposit into via our app
const KNOWN_VAULTS: { address: `0x${string}`; chainId: number; protocol: string; name: string; asset: string; decimals: number }[] = [
  // Base — Morpho steakUSDC vaults
  { address: "0xbeefe94c8ad530842bfe7d8b397938ffc1cb83b2", chainId: 8453, protocol: "Morpho", name: "steakUSDC", asset: "USDC", decimals: 6 },
  { address: "0xbeef010f9cb27031ad51e3333f9af9c6b1228183", chainId: 8453, protocol: "Morpho", name: "steakUSDC", asset: "USDC", decimals: 6 },
  { address: "0xbeef0e0834849acc03f0089f01f4f1eeb06873c9", chainId: 8453, protocol: "Morpho", name: "steakUSDC", asset: "USDC", decimals: 6 },
  // Base — Morpho USDC vaults
  { address: "0x1d3b1cd0a0f242d598834b3f2d126dc6bd774657", chainId: 8453, protocol: "Morpho", name: "Morpho USDC", asset: "USDC", decimals: 18 },
  { address: "0xc1256ae5ff1cf2719d4937adb3bbccab2e00a2ca", chainId: 8453, protocol: "Morpho", name: "Morpho USDC", asset: "USDC", decimals: 18 },
  { address: "0x7bfa7c4f149e7415b73bdedfe609237e29cbf34a", chainId: 8453, protocol: "Morpho", name: "Morpho USDC", asset: "USDC", decimals: 18 },
  // Base — Aave aUSDC
  { address: "0x4e65fe4dba92790696d040ac24aa414708f5c0ab", chainId: 8453, protocol: "Aave", name: "Aave USDC", asset: "USDC", decimals: 6 },
  // Base — Compound cUSDCv3
  { address: "0xb125e6687d4313864e53df431d5425969c15eb2f", chainId: 8453, protocol: "Compound", name: "Compound USDC", asset: "USDC", decimals: 6 },
  // Base — Euler
  { address: "0xe0a80d35bc3be36b9a31f987281ba7fda3994cd", chainId: 8453, protocol: "Euler", name: "Euler USDC", asset: "USDC", decimals: 6 },
  // Arbitrum — Aave aUSDC
  { address: "0x724dc807b04555b71ed48a6896b6f41593b8c637", chainId: 42161, protocol: "Aave", name: "Aave USDC", asset: "USDC", decimals: 6 },
  // Arbitrum — Morpho
  { address: "0xec9b1a769d7b6e88b3ca0f83b08c25dbfb7da710", chainId: 42161, protocol: "Morpho", name: "Morpho USDC", asset: "USDC", decimals: 18 },
  // Ethereum — Maple
  { address: "0x80ac24aa929ead5a84ae21e2b0e6a4e3ef1e1bb0", chainId: 1, protocol: "Maple", name: "Maple USDC", asset: "USDC", decimals: 6 },
];

async function fetchOnChainPositions(walletAddress: string): Promise<PortfolioPosition[]> {
  const wallet = walletAddress as `0x${string}`;
  const positions: PortfolioPosition[] = [];

  // Parallel balance checks — fast because it's only ~12 contracts
  const checks = KNOWN_VAULTS.map(async (vault) => {
    const client = CHAIN_CLIENTS[vault.chainId];
    if (!client) return;
    try {
      // Read balance and actual decimals in parallel
      const [balance, decimals] = await Promise.all([
        client.readContract({ address: vault.address, abi: ERC20_ABI, functionName: "balanceOf", args: [wallet] }) as Promise<bigint>,
        client.readContract({ address: vault.address, abi: ERC20_ABI, functionName: "decimals" }).catch(() => 18) as Promise<number>,
      ]);

      if (balance > 0n) {
        const shareFormatted = parseFloat(formatUnits(balance, decimals));

        // Convert shares → underlying USDC assets using ERC-4626 convertToAssets
        // This gives the real USD value regardless of share price
        let balanceUsd = shareFormatted; // fallback: 1:1
        try {
          const assets = await client.readContract({
            address: vault.address,
            abi: ERC20_ABI,
            functionName: "convertToAssets",
            args: [balance],
          }) as bigint;
          // Underlying is USDC (6 decimals)
          balanceUsd = parseFloat(formatUnits(assets, 6));
        } catch { /* vault may not be ERC-4626 */ }

        positions.push({
          vaultAddress: vault.address,
          chainId: vault.chainId,
          protocol: vault.protocol,
          asset: vault.asset,
          balance: balance.toString(),
          balanceUsd,
          apy: 0,
          name: `${vault.name} — ${CHAIN_NAMES[vault.chainId]}`,
        });
      }
    } catch { /* not held */ }
  });

  await Promise.allSettled(checks);

  // Enrich APY from Earn API for found positions
  if (positions.length > 0) {
    try {
      const headers: Record<string, string> = {};
      if (LIFI_API_KEY) headers["x-lifi-api-key"] = LIFI_API_KEY;

      for (const pos of positions) {
        try {
          const res = await fetch(
            `${EARN_BASE}/v1/earn/vaults/${pos.chainId}/${pos.vaultAddress}`,
            { headers }
          );
          if (res.ok) {
            const v = await res.json();
            const rawApy = v.analytics?.apy?.total ?? 0;
            pos.apy = rawApy > 5 ? rawApy / 100 : rawApy;
            if (v.name) pos.name = `${v.name} — ${CHAIN_NAMES[pos.chainId]}`;
          }
        } catch { /* skip enrichment */ }
      }
    } catch { /* skip */ }
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

  // Fallback: scan known vault contracts on-chain (~1-2s)
  const onChain = await fetchOnChainPositions(address);
  return NextResponse.json(onChain);
}
