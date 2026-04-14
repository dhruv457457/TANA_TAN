import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Delegation, Strategy } from "@/lib/db/models";

// POST /api/delegations — save ERC-7715 permission after user approves "Copy"
export async function POST(req: NextRequest) {
  try {
    await connectDB();
  } catch (err) {
    console.error("[delegations] DB connection failed:", err);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
  
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

  try {
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

    // Increment follower count + add to totalValueManaged
    await Strategy.findByIdAndUpdate(strategyId, {
      $inc: { followerCount: 1, totalValueManaged: amount ?? 100 },
    });

    return NextResponse.json(delegation, { status: 201 });
  } catch (err) {
    console.error("[delegations] Query failed:", err);
    return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
  }
}

// GET /api/delegations?followerAddress=0x...
export async function GET(req: NextRequest) {
  try {
    await connectDB();
  } catch (err) {
    console.error("[delegations] DB connection failed:", err);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
  
  const { searchParams } = new URL(req.url);
  const followerAddress = searchParams.get("followerAddress");
  if (!followerAddress) return NextResponse.json([], { status: 200 });

  try {
    const delegations = await Delegation.find({
      followerAddress: followerAddress.toLowerCase(),
      isActive: true,
    })
      .populate("strategyId")
      .lean();

    return NextResponse.json(delegations);
  } catch (err) {
    console.error("[delegations] Query failed:", err);
    return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
  }
}
