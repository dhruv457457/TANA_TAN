import { NextRequest, NextResponse } from "next/server";
import { parseIntentHeuristic } from "@/lib/intent";

export async function POST(request: NextRequest) {
  const { message } = await request.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // Use heuristic parser (supports protocol filtering)
  const heuristic = parseIntentHeuristic(message);
  console.log("[intent] Parsing:", message, "->", JSON.stringify(heuristic));
  return NextResponse.json(heuristic);
}
