import { NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { requireBarberContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const from = startOfMonth(new Date());
  const bookings = await prisma.booking.findMany({
    where: { barberId: ctx.barber.id, date: { gte: from }, status: "CONFIRMED" },
    include: { service: true },
  });

  const total = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + b.service.price, 0);
  const avgTicket = total > 0 ? Math.round(totalRevenue / total) : 0;

  const byService = new Map<string, number>();
  for (const b of bookings) byService.set(b.service.name, (byService.get(b.service.name) ?? 0) + 1);
  const topService = [...byService.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  const daysElapsed = Math.max(1, new Date().getDate());
  const occupancy = Math.min(100, Math.round((total / (daysElapsed * 8)) * 100));

  return NextResponse.json({ total, totalRevenue, avgTicket, topService, occupancy });
}
