import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { addMinutes, differenceInHours, format, parse } from "date-fns";
import { dateAtBrMidnight } from "@/lib/datetime";
import { getAvailableSlots } from "@/lib/availability";

const PatchBody = z.object({
  action: z.enum(["cancel", "reschedule", "confirm"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id as string } });
  if (!customer) return NextResponse.json({ error: "Perfil de cliente nao encontrado." }, { status: 404 });

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, customerId: customer.id },
    include: { service: true, barber: { include: { schedule: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });

  const bookingDate = new Date(booking.date);
  const bookingStart = parse(booking.startTime, "HH:mm", bookingDate);
  const minHours = booking.barber.cancelHours ?? 2;
  if (differenceInHours(bookingStart, new Date()) < minHours && parsed.data.action !== "confirm") {
    return NextResponse.json(
      { error: `Alteracoes so podem ser feitas com pelo menos ${minHours}h de antecedencia.` },
      { status: 422 },
    );
  }

  if (parsed.data.action === "cancel") {
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELED" },
    });
    return NextResponse.json({ ok: true, booking: updated });
  }

  if (parsed.data.action === "confirm") {
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { customerConfirmedAt: new Date() },
    });
    return NextResponse.json({ ok: true, booking: updated });
  }

  if (!parsed.data.date || !parsed.data.startTime) {
    return NextResponse.json({ error: "Informe nova data e horario." }, { status: 400 });
  }
  const rescheduleDate = parsed.data.date;
  const rescheduleStartTime = parsed.data.startTime;

  const availability = await getAvailableSlots(rescheduleDate, booking.serviceId, booking.barberId);
  if (!availability.slots.includes(rescheduleStartTime)) {
    return NextResponse.json({ error: "Horario indisponivel para remarcacao." }, { status: 409 });
  }

  const newDate = dateAtBrMidnight(rescheduleDate);
  const newStart = parse(rescheduleStartTime, "HH:mm", newDate);
  const effectiveDuration =
    booking.service.duration + (booking.service.prepMinutes ?? 0) + (booking.barber.schedule?.bufferMinutes ?? 0);
  const newEnd = addMinutes(newStart, effectiveDuration);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      date: newDate,
      startTime: format(newStart, "HH:mm"),
      endTime: format(newEnd, "HH:mm"),
      customerConfirmedAt: null,
      status: "CONFIRMED",
    },
  });
  return NextResponse.json({ ok: true, booking: updated });
}
