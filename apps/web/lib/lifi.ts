import axios from "axios";
import type { Vault, PortfolioPosition, ComposerQuote } from "@/types";

const EARN_BASE = "https://earn.li.fi";
const COMPOSER_BASE = "https://li.quest";
const LIFI_API_KEY = process.env.LIFI_API_KEY ?? "";

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
  headers: LIFI_API_KEY ? { "x-lifi-api-key": LIFI_API_KEY } : {}
});
const composerClient = axios.create({ baseURL: COMPOSER_BASE, timeout: 15000 });

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
  try {
    const { data } = await earnClient.get("/v1/earn/vaults", {
      params: { chainId },
    });
    const vaults = Array.isArray(data) ? data : (data?.data ?? []);
    if (!Array.isArray(vaults) || !vaults.length) {
      throw new Error(`No vaults found on chain ${chainId}`);
    }
    const vault = vaults.find(
      (v: Vault) => v.address.toLowerCase() === address.toLowerCase()
    );
    if (!vault) {
      throw new Error(`Vault ${address} not found on chain ${chainId}`);
    }
    return vault;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      throw new Error(`LI.FI API error: ${err.response?.status ?? 'network error'} - ${err.message}`);
    }
    throw err;
  }
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
  apiKey: string;
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
    headers: { "x-lifi-api-key": params.apiKey },
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
