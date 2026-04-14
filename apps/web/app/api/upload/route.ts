import { NextRequest, NextResponse } from "next/server";

const CLOUD_NAME = "dfa0ptxxk";
const API_KEY = "825596338336136";
const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? "EvzGbmM_eMpizh3Aca2XNCiA7hA";

// POST /api/upload — upload an image to Cloudinary, return { url }
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Build signed upload request
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "tana-strategies";

    // Sign using Cloudinary's SHA-1 signature
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = await sha1(`${paramsToSign}${API_SECRET}`);

    const body = new FormData();
    body.append("file", file);
    body.append("api_key", API_KEY);
    body.append("timestamp", String(timestamp));
    body.append("folder", folder);
    body.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body,
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "Upload failed" }, { status: 500 });

    return NextResponse.json({ url: data.secure_url });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
