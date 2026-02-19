import { prisma } from "@/lib/prisma";
import { addMinutes, format, isBefore, parse } from "date-fns";
import { brTodayISO, dateAtBrMidnight } from "@/lib/datetime";

function timeOnDate(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

export async function getBarber() {
  return prisma.barberProfile.findFirst({
    include: { schedule: true },
  });
}

function normalizeServiceIds(serviceIds: string | string[]) {
  const list = Array.isArray(serviceIds) ? serviceIds : [serviceIds];
  return list.map((s) => s.trim()).filter(Boolean);
}

export async function getAvailableSlots(dateISO: string, serviceIds: string | string[], barberId?: string) {
  const barber = barberId
    ? await prisma.barberProfile.findUnique({ where: { id: barberId }, include: { schedule: true } })
    : await getBarber();
  if (!barber || !barber.schedule) return { slots: [] as string[], barber, services: [] as any[], effectiveDuration: 0 };

  const ids = normalizeServiceIds(serviceIds);
  if (ids.length === 0) return { slots: [] as string[], barber, services: [] as any[], effectiveDuration: 0 };

  const servicesRaw = await prisma.service.findMany({
    where: { id: { in: ids }, barberId: barber.id, active: true },
  });
  if (servicesRaw.length !== ids.length) return { slots: [] as string[], barber, services: [] as any[], effectiveDuration: 0 };

  const serviceMap = new Map(servicesRaw.map((s) => [s.id, s]));
  const services = ids.map((id) => serviceMap.get(id)).filter(Boolean) as typeof servicesRaw;

  const date = dateAtBrMidnight(dateISO);

  const dow = ((date.getDay() + 6) % 7) + 1;
  const workDays = barber.schedule.workDays.split(",").map((x) => Number(x.trim()));
  if (!workDays.includes(dow)) return { slots: [] as string[], barber, services, effectiveDuration: 0 };

  const dayStart = timeOnDate(date, barber.schedule.startTime);
  const dayEnd = timeOnDate(date, barber.schedule.endTime);
  const slotMinutes = barber.schedule.slotMinutes;
  const bufferMinutes = barber.schedule.bufferMinutes ?? 0;
  const effectiveDuration = services.reduce((sum, service) => sum + service.duration + (service.prepMinutes ?? 0) + bufferMinutes, 0);

  const [blocks, closures, bookings] = await Promise.all([
    prisma.timeBlock.findMany({ where: { barberId: barber.id, date } }),
    prisma.shopClosure.findMany({
      where: {
        barberId: barber.id,
        startAt: { lt: addMinutes(dayEnd, 1) },
        endAt: { gt: dayStart },
      },
    }),
    prisma.booking.findMany({
      where: { barberId: barber.id, date, status: "CONFIRMED" },
    }),
  ]);

  const now = new Date();
  const nowBrHHMM = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const isTodayBr = dateISO === brTodayISO(now);
  const slots: string[] = [];

  for (
    let cursor = new Date(dayStart);
    isBefore(addMinutes(cursor, effectiveDuration), addMinutes(dayEnd, 1));
    cursor = addMinutes(cursor, slotMinutes)
  ) {
    const start = cursor;
    const end = addMinutes(cursor, effectiveDuration);

    const startHHMM = format(start, "HH:mm");
    if (isTodayBr && startHHMM < nowBrHHMM) continue;

    const overlapBooking = bookings.some((b) => {
      const bs = parse(b.startTime, "HH:mm", date);
      const be = parse(b.endTime, "HH:mm", date);
      return start < be && end > bs;
    });

    const overlapBlock = blocks.some((b) => {
      const bs = parse(b.startTime, "HH:mm", date);
      const be = parse(b.endTime, "HH:mm", date);
      return start < be && end > bs;
    });

    const overlapClosure = closures.some((c) => start < c.endAt && end > c.startAt);

    if (!overlapBooking && !overlapBlock && !overlapClosure) slots.push(startHHMM);
  }

  return { slots, barber, services, effectiveDuration };
}
