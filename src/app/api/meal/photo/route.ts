import { NextResponse } from "next/server";
import { analyzePhoto } from "@/lib/ai";
import { aiFailed, aiGuard } from "@/lib/ai/guard";

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image : "";
  // client sends a <=768px JPEG; anything near 1.5MB of base64 is not that
  if (!image || image.length > 1_500_000) return NextResponse.json({ error: "Image missing or too large." }, { status: 400 });
  const g = await aiGuard();
  if ("error" in g) return g.error;
  try {
    return NextResponse.json(await analyzePhoto(image, "image/jpeg"));
  } catch (e) {
    return aiFailed(e);
  }
}
