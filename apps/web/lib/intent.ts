import type { ParsedIntent } from "@/types";

const RISK_KEYWORDS: Record<"safe" | "balanced" | "degen", string[]> = {
  safe: ["safe", "safest", "conservative", "low risk", "stable", "secure"],
  balanced: ["balanced", "moderate", "medium risk", "diversified"],
  degen: ["degen", "aggressive", "high yield", "max apy", "risky"],
};

const ASSET_PATTERNS = ["USDC", "USDT", "DAI", "ETH", "WETH", "WBTC", "BTC"];

const CHAIN_MAP: Record<string, number> = {
  base: 8453,
  ethereum: 1,
  eth: 1,
  mainnet: 1,
  arbitrum: 42161,
  arb: 42161,
  optimism: 10,
  op: 10,
  polygon: 137,
  matic: 137,
};

const PROTOCOL_MAP: Record<string, string> = {
  "aave-v3": "aave-v3",
  "aave v3": "aave-v3",
  "aave": "aave-v3",
  "morpho-v1": "morpho-v1",
  "morpho v1": "morpho-v1",
  "morpho": "morpho-v1",
  "pendle": "pendle",
  "lido": "lido",
  "etherfi": "etherfi",
  "ether fi": "etherfi",
  "stargate": "stargate",
  "uniswap": "uniswap-v3",
  "uniswap v3": "uniswap-v3",
};

function extractChainIds(text: string): number[] | undefined {
  const lower = text.toLowerCase();
  const found: number[] = [];
  for (const [keyword, id] of Object.entries(CHAIN_MAP)) {
    if (lower.includes(keyword)) {
      if (!found.includes(id)) found.push(id);
    }
  }
  return found.length > 0 ? found : undefined;
}

function extractAmount(text: string): number {
  const match = text.match(/\b(\d[\d,]*(?:\.\d+)?)\s*(?:USD|USDC|USDT|DAI|ETH|BTC)?\b/);
  if (!match) return 100;
  return parseFloat(match[1].replace(/,/g, ""));
}

function extractAsset(text: string): string {
  const upper = text.toUpperCase();
  for (const asset of ASSET_PATTERNS) {
    if (upper.includes(asset)) return asset;
  }
  return "USDC";
}

function extractRisk(text: string): "safe" | "balanced" | "degen" {
  const lower = text.toLowerCase();
  for (const [level, keywords] of Object.entries(RISK_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      return level as "safe" | "balanced" | "degen";
    }
  }
  return "balanced";
}

function extractMaxVaults(text: string): number | undefined {
  const lower = text.toLowerCase();
  const singlePhrases = [
    "1 vault", "one vault", "single vault", "all in one", "everything in one",
    "1 pool", "one pool", "just one", "only one", "put it all",
  ];
  if (singlePhrases.some((p) => lower.includes(p))) return 1;
  if (/\b(2|two)\s+vault/.test(lower) || /\b(2|two)\s+pool/.test(lower)) return 2;
  const morePhrases = ["show all", "all options", "more options", "list all", "everything", "top 5", "5 vaults"];
  if (morePhrases.some((p) => lower.includes(p))) return 5;
  return undefined;
}

function extractMinApy(text: string): number {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (match) return parseFloat(match[1]) / 100;
  return 0.03; // default 3%
}

function extractProtocols(text: string): { preferred?: string[]; excluded?: string[] } {
  const lower = text.toLowerCase();
  const preferred: string[] = [];
  const excluded: string[] = [];
  
  // First, identify excluded protocols (with negation patterns)
  const excludePatterns = [
    /not\s+(aave[- ]?v?3?|aave)/i,
    /no\s+(aave[- ]?v?3?|aave)/i,
    /avoid\s+(aave[- ]?v?3?|aave)/i,
    /not\s+(morpho[- ]?v?1?|morpho)/i,
    /no\s+(morpho[- ]?v?1?|morpho)/i,
    /avoid\s+(morpho[- ]?v?1?|morpho)/i,
    /not\s+(pendle)/i,
    /no\s+(pendle)/i,
    /avoid\s+(pendle)/i,
    /not\s+(euler)/i,
    /no\s+(euler)/i,
    /avoid\s+(euler)/i,
  ];
  
  for (const pattern of excludePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const protocol = match[1].toLowerCase().replace(/[- ]?v?1?/g, "").trim();
      if (protocol === "aave") excluded.push("aave-v3");
      else if (protocol === "morpho") excluded.push("morpho-v1");
      else if (protocol === "pendle") excluded.push("pendle");
      else if (protocol === "euler") excluded.push("euler");
    }
  }
  
  // Then check for preferred protocols (excluding any that are negated)
  for (const [keyword, protocol] of Object.entries(PROTOCOL_MAP)) {
    // Skip if this protocol is excluded
    const isExcluded = excluded.some(e => protocol.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(protocol.toLowerCase()));
    if (isExcluded) continue;
    
    if (lower.includes(keyword)) {
      if (!preferred.includes(protocol)) {
        preferred.push(protocol);
      }
    }
  }
  
  return {
    preferred: preferred.length > 0 ? preferred : undefined,
    excluded: excluded.length > 0 ? excluded : undefined,
  };
}

// Heuristic parser — used as fallback when API is unavailable
export function parseIntentHeuristic(text: string): ParsedIntent {
  const protocols = extractProtocols(text);
  return {
    asset: extractAsset(text),
    amount: extractAmount(text),
    riskTolerance: extractRisk(text),
    minApy: extractMinApy(text),
    chainIds: extractChainIds(text),
    maxVaults: extractMaxVaults(text),
    preferredProtocols: protocols.preferred,
    excludedProtocols: protocols.excluded,
    raw: text,
  };
}

// Calls our own /api/intent which proxies Claude
export async function parseIntent(text: string): Promise<ParsedIntent> {
  try {
    const res = await fetch("/api/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch {
    return parseIntentHeuristic(text);
  }
}
