import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Strategy } from "@/lib/db/models";

// POST /api/strategies/:id/like  body: { address }
// Toggles a like — adds if not present, removes if already liked
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { address } = await req.json();
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  await connectDB();
  const addr = address.toLowerCase();
  const strategy = await Strategy.findById(id);
  if (!strategy) return NextResponse.json({ error: "not found" }, { status: 404 });

  const alreadyLiked = strategy.likes?.includes(addr);
  if (alreadyLiked) {
    strategy.likes = strategy.likes.filter((a: string) => a !== addr);
  } else {
    strategy.likes = [...(strategy.likes ?? []), addr];
  }
  await strategy.save();

  return NextResponse.json({ likes: strategy.likes.length, liked: !alreadyLiked });
}
