import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Strategy } from "@/lib/db/models";

// GET /api/strategies?chainId=8453&sort=apy&limit=20
export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get("chainId");
  const sort = searchParams.get("sort") ?? "followerCount"; // apy | followerCount | createdAt
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { isActive: true };
  if (chainId) filter.chainId = Number(chainId);

  const sortField: Record<string, 1 | -1> =
    sort === "apy" ? { apy: -1 } : sort === "new" ? { createdAt: -1 } : { followerCount: -1 };

  const strategies = await Strategy.find(filter).sort(sortField).limit(limit).lean();
  return NextResponse.json(strategies);
}

// POST /api/strategies — create a new strategy post
export async function POST(req: NextRequest) {
  const conn = await connectDB();
  // Drop stale unique index on strategyId (removed from schema but still in DB)
  try {
    if (conn) {
      const col = conn.connection.collection("strategies");
      await col.dropIndex("strategyId_1");
    }
  } catch { /* index doesn't exist — fine */ }

  const body = await req.json();
  const {
    author, vaultAddress, chainId, protocol, chainName,
    vaultName, asset, apy, tvlUsd, riskLabel, pitch,
  } = body;

  if (!author || !vaultAddress || !chainId || !protocol) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const strategy = await Strategy.create({
    author: author.toLowerCase(),
    vaultAddress: vaultAddress.toLowerCase(),
    chainId,
    protocol,
    chainName: chainName ?? "",
    vaultName: vaultName ?? "",
    asset: asset ?? "USDC",
    apy: apy ?? 0,
    tvlUsd: tvlUsd ?? 0,
    riskLabel: riskLabel ?? "Balanced",
    pitch: pitch ?? "",
    lastTriggeredAt: new Date(), // trigger immediately so new followers execute on first poll
  });

  return NextResponse.json(strategy, { status: 201 });
}
