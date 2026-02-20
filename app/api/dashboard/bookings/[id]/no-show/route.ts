import { NextResponse } from "next/server";
import { requireBarberContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, barberId: ctx.barber.id },
    include: { customer: true },
  });
  if (!booking) return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });

  const noShowCount = (booking.customer.noShowCount ?? 0) + 1;

  const [, updatedCustomer] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "NO_SHOW", noShowMarkedAt: new Date() },
    }),
    prisma.customerProfile.update({
      where: { id: booking.customerId },
      data: {
        noShowCount,
        blockedUntil: null,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    noShowCount: updatedCustomer.noShowCount,
    blockedUntil: updatedCustomer.blockedUntil,
  });
}
