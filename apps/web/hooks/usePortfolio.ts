"use client";
import { useQuery } from "@tanstack/react-query";
import type { PortfolioPosition } from "@/types";

async function fetchPortfolio(address: string): Promise<PortfolioPosition[]> {
  const res = await fetch(`/api/portfolio/${address}`);
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  return res.json();
}

export function usePortfolio(address?: string | null) {
  return useQuery({
    queryKey: ["portfolio", address],
    queryFn: () => fetchPortfolio(address!),
    enabled: !!address,
    staleTime: 5 * 60_000,  // 5 minutes — don't refetch on every render
    gcTime: 10 * 60_000,    // keep in cache for 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
