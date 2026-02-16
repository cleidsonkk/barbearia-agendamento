import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBarberContext } from "@/lib/apiAuth";
import { dateAtBrMidnight } from "@/lib/datetime";

export async function GET(req: Request) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  if (date) {
    const d = dateAtBrMidnight(date);
    const blocks = await prisma.timeBlock.findMany({ where: { barberId: ctx.barber.id, date: d } });
    return NextResponse.json({ blocks });
  }

  const blocks = await prisma.timeBlock.findMany({
    where: { barberId: ctx.barber.id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ blocks });
}

const Create = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const parsed = Create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });

  const d = dateAtBrMidnight(parsed.data.date);

  const block = await prisma.timeBlock.create({
    data: {
      barberId: ctx.barber.id,
      date: d,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ ok: true, block });
}
