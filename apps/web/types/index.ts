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
  protocolLogoUri?: string;
  name: string;
  asset: string;
  assetAddress: string;
  apy: VaultApy;
  tvl: VaultTvl;
  timeLock: number;
  tags: string[];
  isTransactional?: boolean;
  isRedeemable?: boolean;
  riskScore?: number;
  riskLabel?: "Safe" | "Balanced" | "Degen";
}

export interface ParsedIntent {
  asset: string;
  amount: number;
  riskTolerance: "safe" | "balanced" | "degen";
  minApy: number;
  chains?: string[];
  chainIds?: number[]; // explicit chain filter from user
  maxVaults?: number; // 1 = single-vault mode
  preferredProtocols?: string[]; // e.g. ["aave-v3", "morpho-v1"]
  excludedProtocols?: string[]; // e.g. ["morpho-v1"]
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
  chainName?: string;
  tags?: string[];
  tvlUsd?: number;
  apyBreakdown?: { base: number; reward: number; total: number };
  isRedeemable?: boolean;
  isTransactional?: boolean;
  yieldEarned?: number;
}

export interface ComposerQuote {
  error?: string;
  code?: number;
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  steps: QuoteStep[];
  estimate?: {
    executionDuration: number;
    gasCosts: { amountUsd: string }[];
  };
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
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
