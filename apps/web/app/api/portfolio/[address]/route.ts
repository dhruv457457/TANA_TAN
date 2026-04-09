import { NextRequest, NextResponse } from "next/server";
import type { PortfolioPosition } from "@/types";

const EARN_BASE = "https://earn.li.fi";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${EARN_BASE}/v1/earn/portfolio/${address}/positions`,
      { next: { revalidate: 30 } }
    );

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const json = await res.json();
    const positions: PortfolioPosition[] = Array.isArray(json)
      ? json
      : (json.data ?? []);
    return NextResponse.json(positions);
  } catch {
    return NextResponse.json([]);
  }
}
