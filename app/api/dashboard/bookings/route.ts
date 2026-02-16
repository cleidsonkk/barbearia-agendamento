import { NextResponse } from "next/server";
import { requireBarberContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { brTodayISO, dateAtBrMidnight } from "@/lib/datetime";

export async function GET(req: Request) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const d = date ? dateAtBrMidnight(date) : dateAtBrMidnight(brTodayISO());

  const bookings = await prisma.booking.findMany({
    where: { barberId: ctx.barber.id, date: d, status: "CONFIRMED" },
    include: { customer: true, service: true },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ bookings });
}
