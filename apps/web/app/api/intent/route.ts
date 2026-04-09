import { NextRequest, NextResponse } from "next/server";
import { parseIntentHeuristic } from "@/lib/intent";
import type { ParsedIntent } from "@/types";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: NextRequest) {
  const { message } = await request.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  if (OPENROUTER_API_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://tana-tan.vercel.app",
          "X-Title": "TANA-TAN",
        },
        body: JSON.stringify({
          model: "anthropic/claude-haiku-4-5",
          max_tokens: 256,
          messages: [
            {
              role: "user",
              content: `Extract yield intent from this message. Return ONLY valid JSON with these keys:
- asset: string (e.g. "USDC", "ETH")
- amount: number (USD value)
- riskTolerance: "safe"|"balanced"|"degen"
- minApy: number 0-1 (e.g. 0.05 for 5%)
- chainIds: number[] or null (EVM chain IDs mentioned: Base=8453, Ethereum=1, Arbitrum=42161, Optimism=10, Polygon=137. null if no specific chain mentioned)
No markdown, no explanation. Message: "${message}"`,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content ?? "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Also run heuristic to catch chain mentions AI might miss
          const heuristic = parseIntentHeuristic(message);
          const intent: ParsedIntent = {
            asset: parsed.asset ?? "USDC",
            amount: Number(parsed.amount) || 100,
            riskTolerance: parsed.riskTolerance ?? "balanced",
            minApy: Number(parsed.minApy) || 0.03,
            chainIds: (Array.isArray(parsed.chainIds) && parsed.chainIds.length > 0)
              ? parsed.chainIds
              : heuristic.chainIds,
            raw: message,
          };
          return NextResponse.json(intent);
        }
      }
    } catch {
      // fall through to heuristic
    }
  }

  return NextResponse.json(parseIntentHeuristic(message));
}
