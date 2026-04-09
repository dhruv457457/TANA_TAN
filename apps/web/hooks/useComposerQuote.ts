"use client";
import { useQuery } from "@tanstack/react-query";
import type { ComposerQuote } from "@/types";

interface QuoteParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress: string;
}

async function fetchQuote(params: QuoteParams): Promise<ComposerQuote> {
  const res = await fetch("/api/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to fetch quote");
  return res.json();
}

export function useComposerQuote(params?: QuoteParams | null) {
  return useQuery({
    queryKey: ["quote", params],
    queryFn: () => fetchQuote(params!),
    enabled: !!params,
    staleTime: 30_000,
    retry: 1,
  });
}
