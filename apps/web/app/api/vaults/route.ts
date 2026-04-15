import { NextRequest, NextResponse } from "next/server";
import { scoreAndLabelVaults } from "@/lib/scorer";
import type { Vault } from "@/types";

const EARN_BASE = "https://earn.li.fi";
const LIFI_API_KEY = process.env.LIFI_API_KEY;
if (!LIFI_API_KEY) throw new Error("LIFI_API_KEY is required");

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 137: "Polygon",
};

// Clean up protocol name for display: "morpho-v1" → "Morpho"
function cleanProtocol(name: string): string {
  return name
    .replace(/-v\d+$/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// Build a human-readable vault name from protocol + asset + chain
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildName(v: any): string {
  const protocol = cleanProtocol(v.protocol?.name ?? v.provider ?? "Vault");
  const asset = v.underlyingTokens?.[0]?.symbol ?? "USDC";
  const chain = CHAIN_NAMES[v.chainId] ?? v.network ?? "";
  return `${protocol} ${asset} — ${chain}`;
}

// Map LI.FI NormalizedVault schema → our Vault type
// LI.FI APY values are ALWAYS percentages (3.77 = 3.77%). Store as fractions (0.0377) internally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVault(v: any): Vault {
  // API always returns percentages — always divide by 100
  const toFraction = (n: number | null | undefined): number => {
    if (n == null || isNaN(n)) return 0;
    return n / 100;
  };

  return {
    address: v.address,
    chainId: v.chainId,
    chainName: CHAIN_NAMES[v.chainId] ?? v.network ?? String(v.chainId),
    protocol: cleanProtocol(v.protocol?.name ?? v.provider ?? "Unknown"),
    protocolLogoUri: v.protocol?.logoUri,
    name: buildName(v),
    asset: v.underlyingTokens?.[0]?.symbol ?? "USDC",
    assetAddress: v.underlyingTokens?.[0]?.address ?? "",
    apy: {
      base: toFraction(v.analytics?.apy?.base),
      reward: toFraction(v.analytics?.apy?.reward),
      total: toFraction(v.analytics?.apy?.total),
      apy1d: toFraction(v.analytics?.apy1d),
      apy7d: toFraction(v.analytics?.apy7d),
      apy30d: toFraction(v.analytics?.apy30d),
    },
    tvl: { usd: parseFloat(v.analytics?.tvl?.usd ?? "0") },
    timeLock: v.timeLock ?? 0,
    tags: v.tags ?? [],
    isTransactional: v.isTransactional ?? false,
    isRedeemable: v.isRedeemable ?? false,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const asset = searchParams.get("asset") ?? "USDC";
  const chainId = searchParams.get("chainId");
  const sortBy = searchParams.get("sortBy") ?? "apy";

  const params = new URLSearchParams({
    asset,
    sortBy,
    minTvl: "100000",
    limit: "50",
  });
  if (chainId) params.set("chainId", chainId);

  try {
    const headers: Record<string, string> = { "x-lifi-api-key": LIFI_API_KEY! };

    const res = await fetch(`${EARN_BASE}/v1/earn/vaults?${params}`, {
      headers,
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error("LI.FI Earn API error:", res.status, await res.text());
      return NextResponse.json(getMockVaults());
    }

    const json = await res.json();
    const raw: unknown[] = Array.isArray(json) ? json : (json.data ?? []);
    const vaults: Vault[] = raw.map(mapVault);
    const scored = scoreAndLabelVaults(vaults);
    return NextResponse.json(scored);
  } catch (e) {
    console.error("fetchVaults failed:", e);
    return NextResponse.json(getMockVaults());
  }
}

function getMockVaults(): Vault[] {
  const base: Partial<Vault>[] = [
    {
      address: "0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A",
      chainId: 8453,
      chainName: "Base",
      protocol: "Morpho",
      name: "Morpho USDC Base",
      asset: "USDC",
      assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      apy: { base: 0.048, reward: 0.007, total: 0.055, apy30d: 0.053 },
      tvl: { usd: 28_000_000 },
      timeLock: 0,
      tags: ["stablecoin"],
      isTransactional: true,
      isRedeemable: true,
    },
    {
      address: "0xa0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      chainId: 42161,
      chainName: "Arbitrum",
      protocol: "Aave",
      name: "Aave USDC Arbitrum",
      asset: "USDC",
      assetAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      apy: { base: 0.055, reward: 0.006, total: 0.061, apy30d: 0.058 },
      tvl: { usd: 45_000_000 },
      timeLock: 0,
      tags: ["stablecoin"],
      isTransactional: true,
      isRedeemable: true,
    },
    {
      address: "0x27B4692C93959048833f40702b22FE3578E77759",
      chainId: 1,
      chainName: "Ethereum",
      protocol: "Euler",
      name: "Euler USDC Ethereum",
      asset: "USDC",
      assetAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      apy: { base: 0.05, reward: 0.008, total: 0.058, apy30d: 0.056 },
      tvl: { usd: 38_000_000 },
      timeLock: 0,
      tags: ["stablecoin"],
      isTransactional: true,
      isRedeemable: true,
    },
  ];
  return scoreAndLabelVaults(base as Vault[]);
}
