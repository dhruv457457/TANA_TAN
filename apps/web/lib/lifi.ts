import axios from "axios";
import type { Vault, PortfolioPosition, ComposerQuote } from "@/types";

const EARN_BASE = "https://earn.li.fi";
const COMPOSER_BASE = "https://li.quest";

const earnClient = axios.create({ baseURL: EARN_BASE, timeout: 10000 });
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
  const { data } = await earnClient.get(
    `/v1/earn/vaults/${chainId}/${address}`
  );
  return data;
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
  const { data } = await composerClient.get("/v1/quote", {
    params,
    headers: { "x-lifi-api-key": params.apiKey },
  });
  return data;
}
