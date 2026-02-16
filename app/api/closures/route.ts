import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBarberContext } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const closures = await prisma.shopClosure.findMany({
    where: { barberId: ctx.barber.id },
    orderBy: { startAt: "desc" },
  });
  return NextResponse.json({ closures });
}

const Create = z.object({
  startAt: z.string(),
  endAt: z.string(),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const parsed = Create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });

  const closure = await prisma.shopClosure.create({
    data: {
      barberId: ctx.barber.id,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ ok: true, closure });
}
