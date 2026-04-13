import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { ExecutionLog } from "@/lib/db/models";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address ?? "")) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  await connectDB();

  const logs = await ExecutionLog.find({ followerAddress: address.toLowerCase() })
    .sort({ executedAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(logs);
}
