const BASE = "https://raw.githubusercontent.com/0xpochita/yieldo/33826b17523e8a02ab6fc4a501cc5fdd89cb8d2e/frontend/public/Assets/Images";

export const PROTOCOL_LOGOS: Record<string, string> = {
  "aave-v3": `${BASE}/Logo-DeFi/aave-logo.svg`,
  "aave-v2": `${BASE}/Logo-DeFi/aave-logo.svg`,
  aave: `${BASE}/Logo-DeFi/aave-logo.svg`,
  "euler-v2": `${BASE}/Logo-DeFi/euler-finance-logo.svg`,
  "euler-v1": `${BASE}/Logo-DeFi/euler-finance-logo.svg`,
  euler: `${BASE}/Logo-DeFi/euler-finance-logo.svg`,
  "morpho-v1": "https://github.com/0xpochita/yieldo/blob/main/frontend/public/Assets/Images/Logo-DeFi/morpho-logo.webp?raw=true",
  "morpho-v2": "https://github.com/0xpochita/yieldo/blob/main/frontend/public/Assets/Images/Logo-DeFi/morpho-logo.webp?raw=true",
  morpho: "https://github.com/0xpochita/yieldo/blob/main/frontend/public/Assets/Images/Logo-DeFi/morpho-logo.webp?raw=true",
  yo: "https://github.com/0xpochita/yieldo/blob/main/frontend/public/Assets/Images/Logo-DeFi/yo-protocol-logo.png?raw=true",
  "yo-protocol": "https://github.com/0xpochita/yieldo/blob/main/frontend/public/Assets/Images/Logo-DeFi/yo-protocol-logo.png?raw=true",
};

export const CHAIN_LOGOS: Record<number, string> = {
  8453: "https://github.com/0xpochita/yieldo/blob/main/frontend/public/Assets/Images/Logo-Coin/logo-base.webp?raw=true",
};

export const COIN_LOGOS: Record<string, string> = {
  USDC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=041",
  USDT: `${BASE}/Logo-Coin/usdt-logo.svg`,
};

/** Returns the best logo URL for a protocol, falling back to undefined. */
export function getProtocolLogo(protocol: string): string | undefined {
  const key = protocol.toLowerCase();
  if (PROTOCOL_LOGOS[key]) return PROTOCOL_LOGOS[key];
  // prefix match: "morpho-vault" → "morpho"
  for (const [k, v] of Object.entries(PROTOCOL_LOGOS)) {
    if (key.startsWith(k) || k.startsWith(key.split("-")[0])) return v;
  }
  return undefined;
}
