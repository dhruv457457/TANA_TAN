/**
 * Fetches all transactional ERC-4626 USDC vaults from LI.FI Earn API
 * and saves them to public/vaults.json for use by the portfolio scanner.
 *
 * Run: LIFI_API_KEY=xxx node scripts/fetch-vaults.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, "../app/data/vaults.json");

const EARN_BASE = "https://earn.li.fi";
const LIFI_API_KEY = process.env.LIFI_API_KEY;
if (!LIFI_API_KEY) {
  console.error("Error: LIFI_API_KEY is required. Run: LIFI_API_KEY=xxx node scripts/fetch-vaults.mjs");
  process.exit(1);
}

const CHAIN_IDS = [8453, 1, 42161, 10, 137]; // Base, Ethereum, Arbitrum, Optimism, Polygon
const CHAIN_NAMES = { 8453: "Base", 1: "Ethereum", 42161: "Arbitrum", 10: "Optimism", 137: "Polygon" };

function cleanProtocol(raw) {
  return raw
    .replace(/-v\d+$/i, "")
    .replace(/-/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function fetchPage(chainId, offset, limit = 100) {
  const headers = { Accept: "application/json", "x-lifi-api-key": LIFI_API_KEY };
  const url = `${EARN_BASE}/v1/earn/vaults?chainId=${chainId}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.warn(`  [WARN] ${url} → ${res.status}`);
    return { data: [], total: 0 };
  }
  const json = await res.json();
  const data = Array.isArray(json) ? json : (json.data ?? json.vaults ?? []);
  const total = json.total ?? json.count ?? data.length;
  return { data, total };
}

async function fetchAllForChain(chainId) {
  const results = [];
  const limit = 100;
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const { data, total: t } = await fetchPage(chainId, offset, limit);
    total = t;
    results.push(...data);
    offset += data.length;
    if (data.length < limit) break; // last page
    process.stdout.write(`  fetched ${results.length}/${total}...\r`);
  }
  console.log(`  chain ${chainId}: ${results.length} vaults`);
  return results;
}

async function main() {
  console.log("Fetching vaults from LI.FI Earn...");
  const allVaults = [];

  for (const chainId of CHAIN_IDS) {
    process.stdout.write(`Chain ${chainId} (${CHAIN_NAMES[chainId]})...\n`);
    const raw = await fetchAllForChain(chainId);

    for (const v of raw) {
      // Only include vaults that are transactional (can deposit via Composer)
      if (!v.isTransactional) continue;
      if (!v.address) continue;

      const underlyingTokens = v.underlyingTokens ?? [];
      const assets = underlyingTokens.map((t) => t.symbol).join("+");
      const isStable = underlyingTokens.some((t) =>
        ["USDC", "USDT", "DAI", "LUSD", "FRAX"].includes(t.symbol)
      );

      allVaults.push({
        address: v.address.toLowerCase(),
        chainId,
        chainName: CHAIN_NAMES[chainId],
        protocol: cleanProtocol(v.protocol?.name ?? "Unknown"),
        name: v.name ?? assets,
        asset: assets || "Unknown",
        isStable,
        decimals: 18, // share token — we use convertToAssets for real value
        apy: v.analytics?.apy?.total ?? 0,
        tvlUsd: Number(v.analytics?.tvl?.usd ?? 0),
      });
    }
  }

  // Deduplicate by address (same vault can appear across pages)
  const seenAddresses = new Set();
  const dedupedVaults = [];
  for (const v of allVaults) {
    const key = `${v.chainId}:${v.address}`;
    if (!seenAddresses.has(key)) {
      seenAddresses.add(key);
      dedupedVaults.push(v);
    }
  }
  allVaults.length = 0;
  allVaults.push(...dedupedVaults);

  // Sort: stable first, then by TVL desc
  allVaults.sort((a, b) => {
    if (a.isStable !== b.isStable) return a.isStable ? -1 : 1;
    return b.tvlUsd - a.tvlUsd;
  });

  const out = {
    generatedAt: new Date().toISOString(),
    count: allVaults.length,
    vaults: allVaults,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`\nSaved ${allVaults.length} vaults to ${OUT_FILE}`);

  // Summary
  const byChain = {};
  for (const v of allVaults) {
    byChain[v.chainName] = (byChain[v.chainName] ?? 0) + 1;
  }
  console.table(byChain);
}

main().catch((e) => { console.error(e); process.exit(1); });
