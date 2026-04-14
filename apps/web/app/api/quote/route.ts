import { NextRequest, NextResponse } from "next/server";

const LIFI_API_KEY = process.env.LIFI_API_KEY;
if (!LIFI_API_KEY) throw new Error("LIFI_API_KEY is required");
const COMPOSER_BASE = "https://li.quest";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    fromChain,
    toChain,
    fromToken,
    toToken,   // vault contract address
    fromAmount,
    fromAddress,
  } = body;

  if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  // Composer uses GET /v1/quote with the vault address as toToken
  const params = new URLSearchParams({
    fromChain: String(fromChain),
    toChain: String(toChain),
    fromToken,
    toToken,
    fromAddress,
    toAddress: fromAddress,
    fromAmount: String(fromAmount),
    integrator: "tana-tan",
  });

  try {
    const headers: Record<string, string> = { "x-lifi-api-key": LIFI_API_KEY };

    const res = await fetch(`${COMPOSER_BASE}/v1/quote?${params}`, { headers });
    const json = await res.json();

    if (!res.ok) {
      console.error("Composer quote error:", res.status, json);
      return NextResponse.json({ error: json?.message ?? "Quote failed" }, { status: res.status });
    }

    return NextResponse.json(json);
  } catch (e) {
    console.error("Composer fetch failed:", e);
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }
}
