import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Strategy, Delegation, UserProfile } from "@/lib/db/models";

// GET /api/profile/[address]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const addr = address.toLowerCase();

  await connectDB();

  const [strategies, following, profile] = await Promise.all([
    Strategy.find({ author: addr, isActive: true }).sort({ createdAt: -1 }).limit(20).lean(),
    Delegation.find({ followerAddress: addr, isActive: true }).populate("strategyId").lean(),
    UserProfile.findOne({ address: addr }).lean(),
  ]);

  const userStrategyIds = strategies.map((s) => s._id);
  const followers = await Delegation.find({
    strategyId: { $in: userStrategyIds },
    isActive: true,
  }).lean();

  const followerAddresses = [...new Set(followers.map((f) => f.followerAddress))];

  const followingStrategies = following
    .filter((f) => f.strategyId)
    .map((f) => {
      const s = f.strategyId as unknown as {
        _id: string; author: string; protocol: string;
        vaultName: string; chainName: string; apy: number;
      };
      return { _id: s._id, author: s.author, protocol: s.protocol, vaultName: s.vaultName, chainName: s.chainName, apy: s.apy };
    });

  return NextResponse.json({
    profile: profile ?? null,
    strategies,
    followingCount: following.length,
    followersCount: followers.length,
    followerAddresses,
    followingStrategies,
  });
}

// PATCH /api/profile/[address] — upsert profile (caller must pass matching address in body)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const addr = address.toLowerCase();

  const body = await req.json();
  const { address: callerAddress, displayName, bio, avatarUrl, twitterHandle, websiteUrl } = body;

  if (!callerAddress || callerAddress.toLowerCase() !== addr) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();

  const profile = await UserProfile.findOneAndUpdate(
    { address: addr },
    {
      $set: {
        ...(displayName !== undefined && { displayName: displayName.slice(0, 50) }),
        ...(bio !== undefined && { bio: bio.slice(0, 280) }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(twitterHandle !== undefined && { twitterHandle: twitterHandle.replace(/^@/, "").slice(0, 50) }),
        ...(websiteUrl !== undefined && { websiteUrl: websiteUrl.slice(0, 200) }),
      },
    },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json(profile);
}
