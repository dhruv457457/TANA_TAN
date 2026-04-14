import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Delegation, Strategy } from "@/lib/db/models";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  let body: { action?: string; followerAddress?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "revoke") {
    return NextResponse.json({ error: 'action must be "revoke"' }, { status: 400 });
  }

  await connectDB();

  const delegation = await Delegation.findById(id).lean();
  if (!delegation) {
    return NextResponse.json({ error: "Delegation not found" }, { status: 404 });
  }

  // Optionally verify caller owns this delegation
  if (body.followerAddress) {
    if (delegation.followerAddress.toLowerCase() !== body.followerAddress.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Revoke: set isActive = false
  await Delegation.findByIdAndUpdate(id, { isActive: false });

  // Decrement follower count + subtract from totalValueManaged
  await Strategy.findByIdAndUpdate(delegation.strategyId, {
    $inc: { followerCount: -1, totalValueManaged: -(delegation.amount ?? 100) },
  });

  return NextResponse.json({ success: true, message: "Delegation revoked" });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();

  const delegation = await Delegation.findById(id).lean();
  if (!delegation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(delegation);
}
