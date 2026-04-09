import type { Vault } from "@/types";

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export function scoreVault(vault: Vault): number {
  const apy = vault.apy;
  const apy30d = apy.apy30d ?? apy.total;

  // Stability: how consistent APY is over 30d
  const stabilityScore =
    apy30d > 0 ? 1 - Math.min(1, Math.abs(apy.total - apy30d) / apy30d) : 0.5;

  // TVL score: normalize up to $50M
  const tvlScore = normalize(vault.tvl?.usd ?? 0, 0, 50_000_000);

  // Lock score: no timelock = 1, any lock = 0
  const lockScore = vault.timeLock === 0 ? 1 : 0;

  return stabilityScore * 0.5 + tvlScore * 0.3 + lockScore * 0.2;
}

export function labelVault(score: number): "Safe" | "Balanced" | "Degen" {
  if (score >= 0.7) return "Safe";
  if (score >= 0.4) return "Balanced";
  return "Degen";
}

export function scoreAndLabelVaults(vaults: Vault[]): Vault[] {
  return vaults.map((v) => {
    const riskScore = scoreVault(v);
    return { ...v, riskScore, riskLabel: labelVault(riskScore) };
  });
}

export function filterByRisk(
  vaults: Vault[],
  tolerance: "safe" | "balanced" | "degen"
): Vault[] {
  return vaults.filter((v) => {
    const label = v.riskLabel;
    if (tolerance === "safe") return label === "Safe";
    if (tolerance === "balanced") return label === "Safe" || label === "Balanced";
    return true; // degen accepts all
  });
}

export function allocate(
  vaults: Vault[],
  amount: number,
  tolerance: "safe" | "balanced" | "degen"
): { vault: Vault; percentage: number; amount: number }[] {
  const filtered = filterByRisk(vaults, tolerance)
    .filter((v) => v.apy.total > 0)
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 3);

  if (filtered.length === 0) return [];

  const weights =
    filtered.length === 1
      ? [1]
      : filtered.length === 2
      ? [0.6, 0.4]
      : [0.5, 0.3, 0.2];

  return filtered.map((vault, i) => ({
    vault,
    percentage: weights[i],
    amount: Math.round(amount * weights[i] * 100) / 100,
  }));
}
