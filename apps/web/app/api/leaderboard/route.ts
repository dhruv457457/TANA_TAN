import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Strategy } from "@/lib/db/models";

const EARN_BASE = "https://earn.li.fi";
const LIFI_API_KEY = process.env.LIFI_API_KEY ?? "";

// GET /api/leaderboard?chainId=8453&sort=followers
// Returns top strategies enriched with live APY from LI.FI Earn
export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get("chainId");
  const sort = searchParams.get("sort") ?? "followers"; // followers | apy | new

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { isActive: true };
  if (chainId) filter.chainId = Number(chainId);

  const sortField: Record<string, 1 | -1> =
    sort === "apy" ? { apy: -1 } :
    sort === "new" ? { createdAt: -1 } :
    { followerCount: -1 };

  const strategies = await Strategy.find(filter).sort(sortField).limit(50).lean();

  // Enrich with live APY from LI.FI Earn API
  const headers: Record<string, string> = {};
  if (LIFI_API_KEY) headers["x-lifi-api-key"] = LIFI_API_KEY;

  const enriched = await Promise.all(
    strategies.map(async (s) => {
      try {
        const res = await fetch(
          `${EARN_BASE}/v1/earn/vaults/${s.chainId}/${s.vaultAddress}`,
          { headers, next: { revalidate: 300 } }
        );
        if (res.ok) {
          const v = await res.json();
          const rawApy = v.analytics?.apy?.total ?? 0;
          const liveApy = rawApy / 100; // convert % to fraction
          // Update DB in background (fire and forget)
          Strategy.findByIdAndUpdate(s._id, { apy: liveApy }).exec();
          return { ...s, apy: liveApy, tvlUsd: Number(v.analytics?.tvl?.usd ?? s.tvlUsd) };
        }
      } catch { /* use stored value */ }
      return s;
    })
  );

  return NextResponse.json(enriched);
}
