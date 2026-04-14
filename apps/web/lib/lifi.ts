import axios from "axios";
import type { Vault, PortfolioPosition, ComposerQuote } from "@/types";

const EARN_BASE = "https://earn.li.fi";
const COMPOSER_BASE = "https://li.quest";

function getLifiApiKey(): string {
  const key = process.env.LIFI_API_KEY;
  if (!key) {
    throw new Error("LIFI_API_KEY is required. Set it in .env.local for local or Railway vars for production.");
  }
  return key;
}

// LI.FI Earn API uses network names (not chainIds) in vault detail endpoints
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

const earnClient = axios.create({ 
  baseURL: EARN_BASE, 
  timeout: 10000,
  headers: () => ({ "x-lifi-api-key": getLifiApiKey() })
});
const composerClient = axios.create({ 
  baseURL: COMPOSER_BASE, 
  timeout: 15000,
  headers: () => ({ "x-lifi-api-key": getLifiApiKey() })
});

export async function fetchVaults(params?: {
  asset?: string;
  chainId?: number;
  limit?: number;
}): Promise<Vault[]> {
  const { data } = await earnClient.get("/v1/earn/vaults", {
    params: {
      ...(params?.asset && { asset: params.asset }),
      ...(params?.chainId && { chainId: params.chainId }),
      limit: params?.limit ?? 50,
    },
  });
  // API returns { data: [...] } or direct array
  return Array.isArray(data) ? data : (data.data ?? []);
}

export async function fetchVaultDetail(
  chainId: number,
  address: string
): Promise<Vault> {
  const network = CHAIN_ID_TO_NETWORK[chainId];

  // 1. Try the direct single-vault endpoint first (fast, no pagination needed)
  if (network) {
    try {
      const { data } = await earnClient.get(
        `/v1/earn/vaults/${encodeURIComponent(network)}/${address.toLowerCase()}`
      );
      if (data && data.address) return data as Vault;
    } catch {
      // fall through to paginated search
    }
  }

  // 2. Fall back: paginate through all vaults on this chain to find it
  let cursor: string | undefined;
  do {
    const params: Record<string, string | number> = { chainId, limit: 50 };
    if (cursor) params.cursor = cursor;
    const { data } = await earnClient.get("/v1/earn/vaults", { params });
    const vaults: Vault[] = Array.isArray(data) ? data : (data?.data ?? []);
    const found = vaults.find(
      (v) => v.address.toLowerCase() === address.toLowerCase()
    );
    if (found) return found;
    cursor = data?.nextCursor;
  } while (cursor);

  throw new Error(`Vault ${address} not found on chain ${chainId}`);
}

export async function fetchPortfolioPositions(
  address: string
): Promise<PortfolioPosition[]> {
  const { data } = await earnClient.get(
    `/v1/earn/portfolio/${address}/positions`
  );
  return Array.isArray(data) ? data : (data.data ?? []);
}

export async function fetchComposerQuote(params: {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
  integrator: string;
  apiKey?: string;
}): Promise<ComposerQuote> {
  const { data, status, statusText } = await composerClient.get("/v1/quote", {
    params: {
      fromChain: String(params.fromChainId),
      toChain: String(params.toChainId),
      fromToken: params.fromTokenAddress,
      toToken: params.toTokenAddress,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      integrator: params.integrator,
    },
  });
  
  // Check HTTP status - any non-2xx is an error
  if (status !== 200) {
    const errorMsg = data?.error || data?.message || statusText || `HTTP ${status}`;
    throw new Error(`LI.FI ${status}: ${errorMsg}`);
  }
  
  // Check if LI.FI returned an error in the response body
  if (data.error || data.code || (!data.transactionRequest && !data.routes?.length)) {
    const errorMsg = data.error || data.message || `Code: ${data.code || 'Unknown'}`;
    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
  }
  
  return data;
}
