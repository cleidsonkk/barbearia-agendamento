import { NextResponse } from "next/server";
import { requireBarberContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { toBrDate } from "@/lib/datetime";
import { sendUserPushNotification } from "@/lib/webpush";

function wa(phone: string, msg: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  return `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`;
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, barberId: ctx.barber.id, status: "CONFIRMED" },
    include: {
      customer: { select: { name: true, phone: true, userId: true } },
      service: { select: { name: true } },
      barber: { select: { shopName: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });

  const msg =
    `Ola ${booking.customer.name}, lembrando do seu horario na ${booking.barber.shopName}.\n` +
    `Data: ${toBrDate(booking.date)}\n` +
    `Horario: ${booking.startTime}\n` +
    `Servico: ${booking.service.name}\n` +
    "Se precisar reagendar, avise por aqui.";
  const waLink = wa(booking.customer.phone, msg);

  await prisma.booking.update({
    where: { id: booking.id },
    data: { reminderSentAt: new Date() },
  });

  await sendUserPushNotification(booking.customer.userId, {
    title: "Lembrete de agendamento",
    body: `${booking.barber.shopName}: ${booking.service.name} em ${toBrDate(booking.date)} as ${booking.startTime}.`,
    url: "/me",
  });

  return NextResponse.json({ ok: true, waLink });
}
