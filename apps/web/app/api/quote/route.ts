import { NextRequest, NextResponse } from "next/server";
import type { ComposerQuote } from "@/types";

const LIFI_API_KEY = process.env.LIFI_API_KEY ?? "";
const COMPOSER_BASE = "https://li.quest";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
    fromAmount,
    fromAddress,
  } = body;

  if (!fromChainId || !toChainId || !fromTokenAddress || !fromAmount) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  const params = new URLSearchParams({
    fromChainId: String(fromChainId),
    toChainId: String(toChainId),
    fromTokenAddress,
    toTokenAddress,
    fromAmount,
    fromAddress: fromAddress ?? "0x0000000000000000000000000000000000000001",
    toAddress: fromAddress ?? "0x0000000000000000000000000000000000000001",
    integrator: "tana-tan",
  });

  try {
    const res = await fetch(`${COMPOSER_BASE}/v1/quote?${params}`, {
      headers: LIFI_API_KEY ? { "x-lifi-api-key": LIFI_API_KEY } : {},
    });

    if (!res.ok) {
      return NextResponse.json(getMockQuote(fromChainId, toChainId));
    }

    const quote: ComposerQuote = await res.json();
    return NextResponse.json(quote);
  } catch {
    return NextResponse.json(getMockQuote(fromChainId, toChainId));
  }
}

function getMockQuote(fromChainId: number, toChainId: number): ComposerQuote {
  return {
    id: `mock-${Date.now()}`,
    fromChainId,
    toChainId,
    fromToken: "USDC",
    toToken: "USDC",
    fromAmount: "500000000",
    toAmount: "498000000",
    steps: [
      {
        type: "cross",
        tool: "stargate",
        toolDetails: { name: "Stargate" },
        action: {
          fromChainId,
          toChainId,
          fromToken: { symbol: "USDC" },
          toToken: { symbol: "USDC" },
        },
      },
    ],
    estimate: {
      executionDuration: 180,
      gasCosts: [{ amountUsd: "1.20" }],
    },
  };
}
