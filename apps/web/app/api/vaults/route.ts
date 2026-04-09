import { NextRequest, NextResponse } from "next/server";
import { scoreAndLabelVaults } from "@/lib/scorer";
import type { Vault } from "@/types";

const EARN_BASE = "https://earn.li.fi";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const asset = searchParams.get("asset");
  const chainId = searchParams.get("chainId");
  const limit = searchParams.get("limit") ?? "50";

  const params = new URLSearchParams({ limit });
  if (asset) params.set("asset", asset);
  if (chainId) params.set("chainId", chainId);

  try {
    const res = await fetch(`${EARN_BASE}/v1/earn/vaults?${params}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      // Return mock data for demo if API is down
      return NextResponse.json(getMockVaults());
    }

    const json = await res.json();
    const vaults: Vault[] = Array.isArray(json) ? json : (json.data ?? []);
    const scored = scoreAndLabelVaults(vaults);
    return NextResponse.json(scored);
  } catch {
    return NextResponse.json(getMockVaults());
  }
}

function getMockVaults(): Vault[] {
  const base: Partial<Vault>[] = [
    {
      address: "0xabc1",
      chainId: 8453,
      chainName: "Base",
      protocol: "Morpho",
      name: "Morpho USDC Base",
      asset: "USDC",
      assetAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda0291",
      apy: { base: 0.048, reward: 0.007, total: 0.055, apy30d: 0.053 },
      tvl: { usd: 28_000_000 },
      timeLock: 0,
      tags: ["stablecoin"],
    },
    {
      address: "0xabc2",
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
    },
    {
      address: "0xabc3",
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
    },
    {
      address: "0xabc4",
      chainId: 10,
      chainName: "Optimism",
      protocol: "Yearn",
      name: "Yearn USDT Optimism",
      asset: "USDT",
      assetAddress: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
      apy: { base: 0.07, reward: 0.012, total: 0.082, apy30d: 0.065 },
      tvl: { usd: 12_000_000 },
      timeLock: 0,
      tags: ["stablecoin"],
    },
    {
      address: "0xabc5",
      chainId: 8453,
      chainName: "Base",
      protocol: "Compound",
      name: "Compound ETH Base",
      asset: "ETH",
      assetAddress: "0x0000000000000000000000000000000000000000",
      apy: { base: 0.03, reward: 0.004, total: 0.034, apy30d: 0.032 },
      tvl: { usd: 20_000_000 },
      timeLock: 0,
      tags: [],
    },
  ];

  return scoreAndLabelVaults(base as Vault[]);
}
