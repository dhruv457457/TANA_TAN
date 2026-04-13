import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Strategy, Delegation } from "@/lib/db/models";

// Get type from mongoose model
type StrategyDoc = Awaited<ReturnType<typeof Strategy.findOne>>;

// GET /api/profile/[address] — get user profile data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const addr = address.toLowerCase();
  
  await connectDB();

  // Get user's strategies
  const strategies = await Strategy.find({ author: addr, isActive: true })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Get delegations where user is the follower (who they follow)
  const following = await Delegation.find({ followerAddress: addr, isActive: true })
    .populate("strategyId")
    .lean();

  // Get delegations where user is the author (who follows them)
  const userStrategyIds = strategies.map((s) => s._id);
  const followers = await Delegation.find({
    strategyId: { $in: userStrategyIds },
    isActive: true,
  }).lean();

  // Get unique follower addresses
  const followerAddresses = [...new Set(followers.map((f) => f.followerAddress))];

  // Get following strategy details
  const followingStrategies = following
    .filter((f) => f.strategyId)
    .map((f) => {
      const strategy = f.strategyId as unknown as { _id: string; author: string; protocol: string; vaultName: string; chainName: string; apy: number };
      return {
        _id: strategy._id,
        author: strategy.author,
        protocol: strategy.protocol,
        vaultName: strategy.vaultName,
        chainName: strategy.chainName,
        apy: strategy.apy,
      };
    });

  return NextResponse.json({
    strategies,
    followingCount: following.length,
    followersCount: followers.length,
    followerAddresses,
    followingStrategies,
  });
}