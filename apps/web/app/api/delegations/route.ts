import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Delegation, Strategy } from "@/lib/db/models";

// POST /api/delegations — save ERC-7715 permission after user approves "Copy"
export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const {
    followerAddress,
    strategyId,
    permissionContext,
    delegationManager,
    expiry,
    chainId,
    amount,
  } = body;

  if (!followerAddress || !strategyId || !permissionContext || !delegationManager || !expiry || !chainId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Deactivate any existing delegation for this follower+strategy
  await Delegation.updateMany(
    { followerAddress: followerAddress.toLowerCase(), strategyId, isActive: true },
    { isActive: false }
  );

  // Save new delegation
  const delegation = await Delegation.create({
    followerAddress: followerAddress.toLowerCase(),
    strategyId,
    permissionContext,
    delegationManager,
    expiry,
    chainId,
    amount: amount ?? 100,
    isActive: true,
  });

  // Increment follower count on the strategy
  await Strategy.findByIdAndUpdate(strategyId, { $inc: { followerCount: 1 } });

  return NextResponse.json(delegation, { status: 201 });
}

// GET /api/delegations?followerAddress=0x...
export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const followerAddress = searchParams.get("followerAddress");
  if (!followerAddress) return NextResponse.json([], { status: 200 });

  const delegations = await Delegation.find({
    followerAddress: followerAddress.toLowerCase(),
    isActive: true,
  })
    .populate("strategyId")
    .lean();

  return NextResponse.json(delegations);
}
