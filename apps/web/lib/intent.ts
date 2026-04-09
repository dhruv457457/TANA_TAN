import type { ParsedIntent } from "@/types";

const RISK_KEYWORDS: Record<"safe" | "balanced" | "degen", string[]> = {
  safe: ["safe", "safest", "conservative", "low risk", "stable", "secure"],
  balanced: ["balanced", "moderate", "medium risk", "diversified"],
  degen: ["degen", "aggressive", "high yield", "max apy", "risky"],
};

const ASSET_PATTERNS = ["USDC", "USDT", "DAI", "ETH", "WETH", "WBTC", "BTC"];

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

function extractMinApy(text: string): number {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (match) return parseFloat(match[1]) / 100;
  return 0.03; // default 3%
}

// Heuristic parser — used as fallback when API is unavailable
export function parseIntentHeuristic(text: string): ParsedIntent {
  return {
    asset: extractAsset(text),
    amount: extractAmount(text),
    riskTolerance: extractRisk(text),
    minApy: extractMinApy(text),
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
