import { NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { requireBarberContext } from "@/lib/apiAuth";
import { buildBarberMetrics } from "@/lib/metrics";

export async function GET() {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const from = ctx.barber.metricsResetAt ?? startOfMonth(new Date());
  const metrics = await buildBarberMetrics(ctx.barber.id, from);

  return NextResponse.json({
    total: metrics.totalBookings,
    totalRevenue: metrics.totalRevenue,
    avgTicket: metrics.avgTicket,
    topService: metrics.topService,
    occupancy: metrics.occupancy,
    from,
    to: metrics.to,
  });
}
