"use client";
import { useQuery } from "@tanstack/react-query";

interface DelegationDoc {
  _id: string;
  followerAddress: string;
  strategyId: {
    _id: string;
    vaultAddress: string;
    chainId: number;
    protocol: string;
    vaultName: string;
    chainName: string;
    asset: string;
    apy: number;
    tvlUsd: number;
    pitch: string;
    author: string;
    riskLabel: string;
  };
  amount: number;
  chainId: number;
  expiry: number;
  isActive: boolean;
  lastExecutedAt: string | null;
  executionCount: number;
  createdAt: string;
}

export function useMyDelegations(address: string | null | undefined) {
  return useQuery<DelegationDoc[]>({
    queryKey: ["my-delegations", address],
    queryFn: async () => {
      if (!address) return [];
      const res = await fetch(`/api/delegations?followerAddress=${address}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
