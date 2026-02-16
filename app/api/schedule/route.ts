import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBarberContext } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const barber = await prisma.barberProfile.findUnique({
    where: { id: ctx.barber.id },
    include: { schedule: true },
  });

  return NextResponse.json({ schedule: barber?.schedule ?? null, cancelHours: barber?.cancelHours ?? 2 });
}

const PutBody = z.object({
  workDays: z.string().regex(/^[1-7](,[1-7])*$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.number().int().min(10).max(60),
  bufferMinutes: z.number().int().min(0).max(30).default(0),
  cancelHours: z.number().int().min(1).max(24).default(2),
});

export async function PUT(req: Request) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const parsed = PutBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });

  const { cancelHours, ...scheduleData } = parsed.data;
  const [schedule] = await prisma.$transaction([
    prisma.scheduleRule.upsert({
      where: { barberId: ctx.barber.id },
      update: scheduleData,
      create: { barberId: ctx.barber.id, ...scheduleData },
    }),
    prisma.barberProfile.update({
      where: { id: ctx.barber.id },
      data: { cancelHours },
    }),
  ]);

  return NextResponse.json({ ok: true, schedule, cancelHours });
}
