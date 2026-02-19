import { NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { requireBarberContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { buildBarberMetrics } from "@/lib/metrics";

export async function POST() {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const now = new Date();
  const from = ctx.barber.metricsResetAt ?? startOfMonth(now);
  const metrics = await buildBarberMetrics(ctx.barber.id, from, now);

  await prisma.$transaction([
    prisma.barberMetricReport.create({
      data: {
        barberId: ctx.barber.id,
        type: "MANUAL",
        windowStart: from,
        windowEnd: now,
        totalBookings: metrics.totalBookings,
        totalRevenue: metrics.totalRevenue,
        avgTicket: metrics.avgTicket,
        topService: metrics.topService === "-" ? null : metrics.topService,
        occupancy: metrics.occupancy,
      },
    }),
    prisma.barberProfile.update({
      where: { id: ctx.barber.id },
      data: { metricsResetAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
