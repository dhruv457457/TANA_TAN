import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Strategy } from "@/lib/db/models";
import { getProtocolLogoFromUrl } from "@/lib/protocolLogos";

const EARN_BASE = "https://earn.li.fi";
const LIFI_API_KEY = process.env.LIFI_API_KEY;
if (!LIFI_API_KEY) throw new Error("LIFI_API_KEY is required");

// GET /api/leaderboard?chainId=8453&sort=followers
export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get("chainId");
  const sort = searchParams.get("sort") ?? "followers";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { isActive: true };
  if (chainId) filter.chainId = Number(chainId);

  const sortField: Record<string, 1 | -1> =
    sort === "apy" ? { apy: -1 } :
    sort === "new" ? { createdAt: -1 } :
    { followerCount: -1 };

  const strategies = await Strategy.find(filter).sort(sortField).limit(50).lean();

  if (strategies.length === 0) return NextResponse.json([]);

  const headers: Record<string, string> = { "x-lifi-api-key": LIFI_API_KEY };

  // Batch-fetch vault lists per unique chainId (one request per chain, not per strategy)
  const uniqueChainIds = [...new Set(strategies.map((s) => s.chainId as number))];

  type LiFiVaultRaw = {
    address?: string;
    name?: string;
    analytics?: {
      apy?: { total?: number; base?: number; reward?: number };
      tvl?: { usd?: string | number };
    };
    protocol?: { url?: string; name?: string };
  };

  const chainVaultMaps = new Map<number, Map<string, LiFiVaultRaw>>();

  await Promise.allSettled(
    uniqueChainIds.map(async (cid) => {
      try {
        const res = await fetch(
          `${EARN_BASE}/v1/earn/vaults?chainId=${cid}&limit=200`,
          { headers, next: { revalidate: 300 } }
        );
        if (!res.ok) return;
        const body = await res.json();
        const vaults: LiFiVaultRaw[] = Array.isArray(body) ? body : (body.data ?? []);
        const map = new Map<string, LiFiVaultRaw>();
        for (const v of vaults) {
          if (v.address) map.set(v.address.toLowerCase(), v);
        }
        chainVaultMaps.set(cid, map);
      } catch { /* skip chain */ }
    })
  );

  // Enrich each strategy from the pre-fetched vault maps
  const enriched = strategies.map((s) => {
    try {
      const vaultMap = chainVaultMaps.get(s.chainId as number);
      if (!vaultMap) return s;

      const v = vaultMap.get((s.vaultAddress as string).toLowerCase());
      if (!v) return s;

      const rawApy = v.analytics?.apy?.total ?? 0;
      // LiFi returns APY as percentage (3.77) or decimal (0.0377) — normalise to decimal
      const liveApy = rawApy > 1 ? rawApy / 100 : rawApy;

      const protocolUrl = v.protocol?.url as string | undefined;
      const logoFromApi = getProtocolLogoFromUrl(protocolUrl);
      const protocolLogoUri = logoFromApi || (s.protocolLogoUri as string | undefined) || "";

      // Update DB in the background (don't await)
      Strategy.findByIdAndUpdate(s._id, {
        apy: liveApy,
        ...(protocolLogoUri && { protocolLogoUri }),
      }).exec();

      return {
        ...s,
        apy: liveApy,
        tvlUsd: Number(v.analytics?.tvl?.usd ?? s.tvlUsd ?? 0),
        protocolLogoUri,
      };
    } catch {
      return s;
    }
  });

  return NextResponse.json(enriched);
}
