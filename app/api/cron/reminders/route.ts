import { NextResponse } from "next/server";
import { addHours, isAfter, isBefore, parse } from "date-fns";
import { prisma } from "@/lib/prisma";
import { toBrDate } from "@/lib/datetime";

export async function POST() {
  const now = new Date();
  const limit = addHours(now, 24);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      date: { gte: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    },
    include: { customer: true, barber: true, service: true },
    take: 200,
  });

  const due = bookings.filter((b) => {
    const start = parse(b.startTime, "HH:mm", b.date);
    return isAfter(start, now) && isBefore(start, limit);
  });

  const payload = due.map((b) => {
    const barberPhone = (b.barber.phone ?? "").replace(/\D/g, "");
    const text =
      `Lembrete de agendamento:\n` +
      `Cliente: ${b.customer.name}\n` +
      `Servico: ${b.service.name}\n` +
      `Data: ${toBrDate(b.date)}\n` +
      `Horario: ${b.startTime}`;
    return {
      bookingId: b.id,
      waLink: barberPhone ? `https://wa.me/55${barberPhone}?text=${encodeURIComponent(text)}` : null,
    };
  });

  if (due.length > 0) {
    await prisma.booking.updateMany({
      where: { id: { in: due.map((d) => d.id) } },
      data: { reminderSentAt: now },
    });
  }

  return NextResponse.json({ ok: true, processed: due.length, reminders: payload });
}
