import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    update: {
      userId: session.user.id as string,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    create: {
      userId: session.user.id as string,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}
