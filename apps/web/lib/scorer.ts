import type { Vault } from "@/types";

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export function scoreVault(vault: Vault): number {
  const apy = vault.apy;
  // Cap extreme APYs (flash loans, data anomalies) at 200%
  const total = Math.min(apy.total, 2.0);
  const apy30d = Math.min(apy.apy30d ?? apy.total, 2.0);

  // Stability: how consistent APY is over 30d
  const stabilityScore =
    apy30d > 0 ? 1 - Math.min(1, Math.abs(total - apy30d) / apy30d) : 0.5;

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
  const candidates = filterByRisk(vaults, tolerance)
    .filter((v) => v.apy.total > 0)
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));

  // Pick diverse vaults: prefer different protocols, then different addresses
  const picked: Vault[] = [];
  const seenProtocols = new Set<string>();
  const seenAddresses = new Set<string>();

  // First pass: one per protocol
  for (const v of candidates) {
    if (picked.length >= 3) break;
    const key = v.protocol.toLowerCase();
    if (!seenProtocols.has(key) && !seenAddresses.has(v.address)) {
      picked.push(v);
      seenProtocols.add(key);
      seenAddresses.add(v.address);
    }
  }

  // Second pass: fill remaining slots with best remaining (different address)
  for (const v of candidates) {
    if (picked.length >= 3) break;
    if (!seenAddresses.has(v.address)) {
      picked.push(v);
      seenAddresses.add(v.address);
    }
  }

  if (picked.length === 0) return [];

  const weights =
    picked.length === 1
      ? [1]
      : picked.length === 2
      ? [0.6, 0.4]
      : [0.5, 0.3, 0.2];

  return picked.map((vault, i) => ({
    vault,
    percentage: weights[i],
    amount: Math.round(amount * weights[i] * 100) / 100,
  }));
}
