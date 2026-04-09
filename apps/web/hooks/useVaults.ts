"use client";
import { useQuery } from "@tanstack/react-query";
import type { Vault } from "@/types";

async function fetchVaults(asset?: string): Promise<Vault[]> {
  const params = new URLSearchParams();
  if (asset) params.set("asset", asset);
  const res = await fetch(`/api/vaults?${params}`);
  if (!res.ok) throw new Error("Failed to fetch vaults");
  return res.json();
}

export function useVaults(asset?: string) {
  return useQuery({
    queryKey: ["vaults", asset],
    queryFn: () => fetchVaults(asset),
    staleTime: 60_000,
    retry: 2,
  });
}
