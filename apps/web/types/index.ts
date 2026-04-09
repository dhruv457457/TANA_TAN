export interface VaultApy {
  base: number;
  reward: number;
  total: number;
  apy1d?: number;
  apy7d?: number;
  apy30d?: number;
}

export interface VaultTvl {
  usd: number;
}

export interface Vault {
  address: string;
  chainId: number;
  chainName: string;
  protocol: string;
  name: string;
  asset: string;
  assetAddress: string;
  apy: VaultApy;
  tvl: VaultTvl;
  timeLock: number;
  tags: string[];
  riskScore?: number;
  riskLabel?: "Safe" | "Balanced" | "Degen";
}

export interface ParsedIntent {
  asset: string;
  amount: number;
  riskTolerance: "safe" | "balanced" | "degen";
  minApy: number;
  chains?: string[];
  raw: string;
}

export interface PortfolioPosition {
  vaultAddress: string;
  chainId: number;
  protocol: string;
  asset: string;
  balance: string;
  balanceUsd: number;
  apy: number;
  name: string;
}

export interface ComposerQuote {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  steps: QuoteStep[];
  estimate: {
    executionDuration: number;
    gasCosts: { amountUsd: string }[];
  };
}

export interface QuoteStep {
  type: string;
  tool: string;
  toolDetails: { name: string; logoURI?: string };
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: { symbol: string };
    toToken: { symbol: string };
  };
}

export interface AllocationPlan {
  vault: Vault;
  percentage: number;
  amount: number;
  quote?: ComposerQuote;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: ParsedIntent;
  allocations?: AllocationPlan[];
  timestamp: number;
}

export interface Alert {
  type: "drop" | "opportunity";
  position: PortfolioPosition;
  currentApy: number;
  newApy?: number;
  newVault?: Vault;
  message: string;
}
