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
    staleTime: 30_000,
    retry: 1,
  });
}
