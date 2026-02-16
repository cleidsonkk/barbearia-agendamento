import { NextResponse } from "next/server";
import { requireBarberContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const recent = await prisma.booking.findMany({
    where: { barberId: ctx.barber.id },
    select: {
      customer: {
        select: { id: true, name: true, phone: true },
      },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const byCustomer = new Map<string, { id: string; name: string; phone: string }>();
  for (const row of recent) {
    if (!byCustomer.has(row.customer.id)) {
      byCustomer.set(row.customer.id, {
        id: row.customer.id,
        name: row.customer.name,
        phone: row.customer.phone,
      });
    }
  }

  return NextResponse.json({
    barberId: ctx.barber.id,
    customers: Array.from(byCustomer.values()),
  });
}
