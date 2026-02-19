import { NextResponse } from "next/server";
import { canUseWebPush, getWebPushPublicKey } from "@/lib/webpush";

export async function GET() {
  const publicKey = getWebPushPublicKey();
  return NextResponse.json({ enabled: canUseWebPush(), publicKey });
}
