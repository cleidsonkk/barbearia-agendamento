import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { addMinutes, format, parse } from "date-fns";
import { dateAtBrMidnight, toBrDate } from "@/lib/datetime";
import { getAvailableSlots } from "@/lib/availability";
import { isPlanActive } from "@/lib/plans";

const Body = z.object({
  barberId: z.string(),
  serviceId: z.string().optional(),
  serviceIds: z.array(z.string()).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });

  const serviceIds = parsed.data.serviceIds?.length
    ? parsed.data.serviceIds.map((s) => s.trim()).filter(Boolean)
    : parsed.data.serviceId
      ? [parsed.data.serviceId]
      : [];
  if (serviceIds.length === 0) return NextResponse.json({ error: "Selecione ao menos um servico." }, { status: 400 });

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id as string } });
  if (!customer) return NextResponse.json({ error: "Complete seu perfil" }, { status: 412 });
  if (customer.preferredBarberId && customer.preferredBarberId !== parsed.data.barberId) {
    return NextResponse.json({ error: "Este cliente esta vinculado a outra barbearia." }, { status: 403 });
  }

  if (customer.blockedUntil && customer.blockedUntil > new Date()) {
    return NextResponse.json(
      { error: `Agendamento bloqueado temporariamente por faltas. Libera em ${toBrDate(customer.blockedUntil)}.` },
      { status: 423 },
    );
  }

  const barber = await prisma.barberProfile.findUnique({
    where: { id: parsed.data.barberId },
    include: { schedule: true },
  });
  if (!barber || !barber.schedule) return NextResponse.json({ error: "Barbearia indisponivel" }, { status: 503 });
  if (!isPlanActive(barber.planExpiresAt)) {
    return NextResponse.json({ error: "Esta barbearia esta com plano expirado e temporariamente bloqueada." }, { status: 423 });
  }

  if (!customer.preferredBarberId) {
    await prisma.customerProfile.update({
      where: { id: customer.id },
      data: { preferredBarberId: barber.id },
    });
  }

  const servicesRaw = await prisma.service.findMany({
    where: { id: { in: serviceIds }, barberId: barber.id, active: true },
  });
  if (servicesRaw.length !== serviceIds.length) return NextResponse.json({ error: "Um ou mais servicos sao invalidos." }, { status: 400 });

  const mapServices = new Map(servicesRaw.map((s) => [s.id, s]));
  const orderedServices = serviceIds.map((id) => mapServices.get(id)).filter(Boolean) as typeof servicesRaw;

  const availability = await getAvailableSlots(parsed.data.date, serviceIds, parsed.data.barberId);
  if (!availability.slots.includes(parsed.data.startTime)) {
    const alternatives = availability.slots.slice(0, 3);
    return NextResponse.json(
      {
        error:
          alternatives.length > 0
            ? `Horario indisponivel. Sugestoes: ${alternatives.join(", ")}.`
            : "Horario indisponivel. Atualize e tente novamente.",
      },
      { status: 409 },
    );
  }

  const date = dateAtBrMidnight(parsed.data.date);
  const bufferMinutes = barber.schedule.bufferMinutes ?? 0;

  try {
    const created = await prisma.$transaction(async (tx) => {
      let cursor = parse(parsed.data.startTime, "HH:mm", date);
      const rows = [] as Array<{ id: string; startTime: string; endTime: string; service: { name: string } }>;

      for (const service of orderedServices) {
        const effectiveDuration = service.duration + (service.prepMinutes ?? 0) + bufferMinutes;
        const end = addMinutes(cursor, effectiveDuration);

        const booking = await tx.booking.create({
          data: {
            barberId: barber.id,
            customerId: customer.id,
            serviceId: service.id,
            date,
            startTime: format(cursor, "HH:mm"),
            endTime: format(end, "HH:mm"),
            notes: parsed.data.notes,
          },
          include: { service: true },
        });

        rows.push({
          id: booking.id,
          startTime: booking.startTime,
          endTime: booking.endTime,
          service: { name: booking.service.name },
        });
        cursor = end;
      }

      return rows;
    });

    const barberPhone = (barber.phone ?? "").replace(/\D/g, "");
    const customerPhone = customer.phone.replace(/\D/g, "");
    const brDate = toBrDate(date);
    const first = created[0];
    const last = created[created.length - 1];
    const servicesList = created.map((b) => b.service.name).join(", ");

    const msg =
      `Prezado(a) ${customer.name}, seu agendamento foi confirmado com sucesso.\n` +
      `Servicos: ${servicesList}\n` +
      `Data: ${brDate}\n` +
      `Horario: ${first.startTime} ate ${last.endTime}\n` +
      `Contato: ${customerPhone}`;
    const waLink = barberPhone ? `https://wa.me/55${barberPhone}?text=${encodeURIComponent(msg)}` : null;

    return NextResponse.json({
      ok: true,
      bookingIds: created.map((b) => b.id),
      waLink,
    });
  } catch {
    const latest = await getAvailableSlots(parsed.data.date, serviceIds, parsed.data.barberId);
    const alternatives = latest.slots.slice(0, 3);
    return NextResponse.json(
      {
        error:
          alternatives.length > 0
            ? `Horario indisponivel. Sugestoes: ${alternatives.join(", ")}.`
            : "Horario indisponivel. Atualize e tente novamente.",
      },
      { status: 409 },
    );
  }
}
