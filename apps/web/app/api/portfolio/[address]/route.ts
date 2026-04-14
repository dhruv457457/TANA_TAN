import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { base, mainnet, arbitrum, optimism, polygon } from "viem/chains";
import type { PortfolioPosition } from "@/types";

const EARN_BASE = "https://earn.li.fi";
const LIFI_API_KEY = process.env.LIFI_API_KEY;
if (!LIFI_API_KEY) throw new Error("LIFI_API_KEY is required");

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

// Module-level cache — fetched once from LiFi Earn API, reused across requests
let _vaultCache: VaultEntry[] = [];
let _vaultCacheTime = 0;
const VAULT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getAllVaults(): Promise<VaultEntry[]> {
  if (_vaultCache.length > 0 && Date.now() - _vaultCacheTime < VAULT_CACHE_TTL) {
    return _vaultCache;
  }
  try {
    const EARN_BASE = "https://earn.li.fi";
    const headers: Record<string, string> = { "x-lifi-api-key": LIFI_API_KEY! };

    const vaults: VaultEntry[] = [];
    let cursor: string | undefined;

    do {
      const params = new URLSearchParams({ limit: "100", ...(cursor ? { cursor } : {}) });
      const res = await fetch(`${EARN_BASE}/v1/earn/vaults?${params}`, { headers });
      if (!res.ok) break;
      const body = await res.json();
      const page: {
        address: string; chainId: number; network: string;
        protocol?: { name?: string }; name?: string;
        underlyingTokens?: { symbol?: string; decimals?: number }[];
        analytics?: { apy?: { total?: number }; tvl?: { usd?: string } };
      }[] = Array.isArray(body) ? body : (body.data ?? []);

      for (const v of page) {
        vaults.push({
          address: v.address.toLowerCase(),
          chainId: v.chainId,
          chainName: v.network ?? String(v.chainId),
          protocol: v.protocol?.name ?? "unknown",
          name: v.name ?? "",
          asset: v.underlyingTokens?.[0]?.symbol ?? "USDC",
          isStable: true,
          decimals: v.underlyingTokens?.[0]?.decimals ?? 6,
          apy: v.analytics?.apy?.total ?? 0,
          tvlUsd: parseFloat(v.analytics?.tvl?.usd ?? "0"),
        });
      }
      cursor = body.nextCursor;
    } while (cursor);

    _vaultCache = vaults;
    _vaultCacheTime = Date.now();
    return vaults;
  } catch {
    return _vaultCache; // return stale cache on error
  }
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

  console.log(`[scanChain] Scanning ${vaults.length} vaults on chain ${chainId} for ${wallet}`);

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
  } catch (err) {
    console.log(`[scanChain] Multicall failed for chain ${chainId}: ${err}`);
    return [];
  }

  // Collect vaults with non-zero balance
  const held: { vault: VaultEntry; balance: bigint }[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "success" && r.result && (r.result as bigint) > 0n) {
      held.push({ vault: vaults[i], balance: r.result as bigint });
      console.log(`[scanChain] Found balance for ${vaults[i].protocol} ${vaults[i].name}: ${r.result}`);
    }
  }

  console.log(`[scanChain] Found ${held.length} vaults with balance on chain ${chainId}`);

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

  // Fetch vault list from LiFi API (cached)
  const ALL_VAULTS = await getAllVaults();
  const VAULTS_BY_CHAIN: Record<number, VaultEntry[]> = {};
  for (const v of ALL_VAULTS) {
    if (!VAULTS_BY_CHAIN[v.chainId]) VAULTS_BY_CHAIN[v.chainId] = [];
    VAULTS_BY_CHAIN[v.chainId].push(v);
  }

  console.log(`[fetchOnChainPositions] Starting scan for ${wallet}`);
  console.log(`[fetchOnChainPositions] Vaults to scan:`, Object.entries(VAULTS_BY_CHAIN).map(([c, v]) => `${c}: ${v.length} vaults`));

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

  console.log(`[fetchOnChainPositions] Total positions found: ${positions.length}`);
  console.log(`[fetchOnChainPositions] Positions:`, positions.map(p => `${p.protocol} ${p.name}: $${p.balanceUsd}`));

  // Enrich names + APY from LI.FI Earn for found positions
  if (positions.length > 0) {
    const headers: Record<string, string> = { "x-lifi-api-key": LIFI_API_KEY! };

    type VaultData = {
      address?: string;
      name?: string;
      tags?: string[];
      isRedeemable?: boolean;
      isTransactional?: boolean;
      analytics?: { apy?: { total?: number; base?: number; reward?: number }; tvl?: { usd?: string | number } };
    };

    // Fetch all vaults per chain once (to avoid repeated API calls)
    const chainVaultsCache: Record<number, VaultData[]> = {};
    await Promise.allSettled(
      Object.keys(VAULTS_BY_CHAIN).map(async (chainId) => {
        try {
          const vRes = await fetch(
            `${EARN_BASE}/v1/earn/vaults?chainId=${chainId}`,
            { headers }
          );
          if (vRes.ok) {
            const vData = await vRes.json();
            chainVaultsCache[Number(chainId)] = Array.isArray(vData) ? vData : (vData?.data ?? []);
          }
        } catch { /* skip */ }
      })
    );

    await Promise.allSettled(
      positions.map(async (pos) => {
        try {
          const vaults = chainVaultsCache[pos.chainId] ?? [];
          // Find matching vault by address
          const v = vaults.find((vault) => 
            vault.address?.toLowerCase() === pos.vaultAddress.toLowerCase()
          );
          if (v) {
            const rawApy = v.analytics?.apy?.total ?? 0;
            pos.apy = rawApy / 100;
            pos.apyBreakdown = {
              base: (v.analytics?.apy?.base ?? rawApy) / 100,
              reward: (v.analytics?.apy?.reward ?? 0) / 100,
              total: rawApy / 100,
            };
            if (v.name) pos.name = `${v.name} — ${CHAIN_NAMES[pos.chainId] ?? "Chain"}`;
            pos.tvlUsd = parseFloat(String(v.analytics?.tvl?.usd ?? "0"));
            pos.tags = v.tags ?? [];
            pos.isRedeemable = v.isRedeemable ?? true;
            pos.isTransactional = v.isTransactional ?? true;
            pos.chainName = CHAIN_NAMES[pos.chainId] ?? "Chain";
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

  const headers: Record<string, string> = { "x-lifi-api-key": LIFI_API_KEY! };

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

      console.log(`[portfolio] LI.FI returned ${raw.length} positions for ${address}`);
      console.log(`[portfolio] Raw positions:`, JSON.stringify(raw.slice(0, 2)));

      if (raw.length > 0) {
        const positions: PortfolioPosition[] = raw.map((p) => {
          const protocolName = p.protocolName ?? p.protocol ?? "Unknown Protocol";
          const assetSymbol = p.asset?.symbol ?? "";
          const chainId = p.chainId ?? 1;
          const chainName = CHAIN_NAMES[chainId] ?? "Chain";
          // LI.FI portfolio API returns `address` (vault contract), NOT `vaultAddress`
          const vaultAddress = p.address ?? p.vaultAddress ?? "";

          // LI.FI portfolio fields:
          //   balanceNative = human-readable token amount (e.g. "407393.89")
          //   balance       = may be raw on-chain units OR human-readable (varies)
          //   balanceUsd    = USD value — may be null/missing
          const balanceNative = p.balanceNative ?? "0";
          const assetDecimals = p.asset?.decimals ?? 6;
          const rawOnChain = parseFloat(p.balance ?? "0");
          // If balance looks like raw on-chain (> 1e6 for 6-decimal tokens), normalise it
          const rawBalanceHuman = rawOnChain > 1_000_000
            ? rawOnChain / Math.pow(10, assetDecimals)
            : (rawOnChain > 0 ? rawOnChain : parseFloat(balanceNative));
          const balanceUsd = parseFloat(p.balanceUsd ?? "0");
          // Prefer explicit USD value; fall back to native amount (≈ USD for stables)
          const displayBalance = balanceUsd > 0.01 ? balanceUsd : (rawBalanceHuman > 0 ? rawBalanceHuman : 0);

          const vaultName = p.name
            ? `${p.name} — ${chainName}`
            : (assetSymbol ? `${protocolName} ${assetSymbol} — ${chainName}` : `${protocolName} — ${chainName}`);

          return {
            vaultAddress,
            chainId,
            protocol: protocolName,
            asset: assetSymbol || "USDC",
            balance: balanceNative,
            balanceUsd: displayBalance,
            apy: typeof p.apy === "number" ? (p.apy > 1 ? p.apy / 100 : p.apy) : 0,
            name: vaultName,
            chainName,
            isRedeemable: p.isRedeemable ?? true,
            isTransactional: p.isTransactional ?? true,
            tags: p.tags ?? [],
          };
        });
        
        console.log(`[portfolio] Mapped ${positions.length} positions`);
        console.log(`[portfolio] Position addresses:`, positions.map(p => ({ protocol: p.protocol, vault: p.vaultAddress })));

        // Enrich with vault details from LI.FI Earn for APY/TVL/tags
        // This is optional - if it fails, we still return the raw positions
        try {
          type LifIVault = {
            address?: string;
            name?: string;
            protocol?: string | { name?: string; url?: string };
            // LiFi vaults API uses `underlyingTokens`, NOT `asset`
            underlyingTokens?: { address?: string; symbol?: string; decimals?: number }[];
            tags?: string[];
            isRedeemable?: boolean;
            isTransactional?: boolean;
            analytics?: { apy?: { total?: number; base?: number; reward?: number }; tvl?: { usd?: string | number } };
          };

          // Fetch vaults for each chain (cache them)
          const chainVaultsCache: Record<number, LifIVault[]> = {};
          for (const chainId of [...new Set(positions.map(p => p.chainId))]) {
            try {
              const vRes = await fetch(
                `${EARN_BASE}/v1/earn/vaults?chainId=${chainId}&limit=100`,
                { headers }
              );
              if (vRes.ok) {
                const vData = await vRes.json();
                chainVaultsCache[chainId] = Array.isArray(vData) ? vData : (vData?.data ?? []);
              }
            } catch { /* skip */ }
          }

          for (const pos of positions) {
            try {
              const vaults = chainVaultsCache[pos.chainId] ?? [];
              
              // First try: match by vault address directly
              let v = vaults.find((vault) => 
                vault.address?.toLowerCase() === pos.vaultAddress.toLowerCase()
              );
              
              // Second try: match by protocol + underlying asset symbol
              // NOTE: LiFi vaults API uses `underlyingTokens[0].symbol`, not `asset.symbol`
              if (!v) {
                const matches = vaults.filter((vault) => {
                  const vaultProtocol = typeof vault.protocol === 'string'
                    ? vault.protocol
                    : vault.protocol?.name ?? '';
                  const protocolMatch = vaultProtocol.toLowerCase().includes(pos.protocol.toLowerCase().split("-")[0]);
                  const assetMatch = vault.underlyingTokens?.[0]?.symbol?.toLowerCase() === pos.asset.toLowerCase();
                  return protocolMatch && assetMatch;
                });

                v = matches[0];
                if (v) {
                  console.log(`[portfolio] LI.FI matched by protocol+asset to ${v.name} (${v.address})`);
                } else {
                  console.log(`[portfolio] No match for protocol=${pos.protocol} asset=${pos.asset} on chain ${pos.chainId}`);
                }
              }
              
              if (v) {
                const rawApy = v.analytics?.apy?.total ?? 0;
                // LiFi returns APY as percentage (3.77) or decimal (0.0377) — normalise to decimal
                const normApy = rawApy > 1 ? rawApy / 100 : rawApy;
                pos.apy = normApy;
                pos.apyBreakdown = {
                  base: (() => { const b = v.analytics?.apy?.base ?? rawApy; return b > 1 ? b / 100 : b; })(),
                  reward: (() => { const r = v.analytics?.apy?.reward ?? 0; return r > 1 ? r / 100 : r; })(),
                  total: normApy,
                };
                if (v.name) {
                  pos.name = `${v.name} — ${CHAIN_NAMES[pos.chainId] ?? "Chain"}`;
                }
                pos.tvlUsd = parseFloat(String(v.analytics?.tvl?.usd ?? "0"));
                pos.tags = v.tags ?? [];
                pos.isRedeemable = v.isRedeemable ?? true;
                pos.isTransactional = v.isTransactional ?? true;
                pos.protocol = typeof v.protocol === 'string' 
                  ? v.protocol 
                  : (v.protocol?.name ?? pos.protocol);
                // Update vault address if we found a better match
                if (v.address) {
                  pos.vaultAddress = v.address;
                }
              }
            } catch { /* skip single enrichment */ }
          }
        } catch (enrichErr) {
          console.log(`[portfolio] LI.FI enrichment failed: ${enrichErr}, continuing with LI.FI data`);
        }

        // Filter out zero-balance positions and return
        const nonZeroPositions = positions.filter((p) => p.balanceUsd > 0.01);
        console.log(`[portfolio] Returning ${nonZeroPositions.length} LI.FI positions`);
        return NextResponse.json(nonZeroPositions);
      }
    }
  } catch (err) { 
    console.log(`[portfolio] LI.FI API failed: ${err}`); 
  }

  // If LI.FI completely fails, use on-chain scan only
  console.log(`[portfolio] Falling back to on-chain scan only for ${address}`);
  const onChain = await fetchOnChainPositions(address);
  const nonZeroOnChain = onChain.filter((p) => p.balanceUsd > 0);
  console.log(`[portfolio] On-chain scan found ${nonZeroOnChain.length} non-zero positions`);
  return NextResponse.json(nonZeroOnChain);
}
