"use client";
import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import type { Vault } from "@/types";

async function fetchVaults(chainId?: number): Promise<Vault[]> {
  const params = new URLSearchParams({ sortBy: "apy" });
  if (chainId) params.set("chainId", String(chainId));
  const res = await fetch(`/api/vaults?${params}`);
  if (!res.ok) return [];
  return res.json();
}

const SUPPORTED_CHAINS = new Set([1, 8453, 42161, 10, 137]);

export function useVaults() {
  const chainId = useChainId();
  // Only fetch for the user's current chain — ChatInterface handles cross-chain filtering
  const preferredChain = SUPPORTED_CHAINS.has(chainId) ? chainId : undefined;

  return useQuery({
    queryKey: ["vaults", preferredChain],
    queryFn: () => fetchVaults(preferredChain),
    staleTime: 60_000,
    retry: 2,
  });
}
