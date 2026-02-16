import { NextResponse } from "next/server";
import { addDays, format } from "date-fns";
import { requireSession } from "@/lib/apiAuth";
import { getAvailableSlots } from "@/lib/availability";
import { prisma } from "@/lib/prisma";
import { isPlanActive } from "@/lib/plans";
import { brTodayISO, dateAtBrMidnight } from "@/lib/datetime";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id as string } });
  if (!customer) return NextResponse.json({ error: "Complete seu perfil" }, { status: 412 });

  const url = new URL(req.url);
  const barberId = url.searchParams.get("barberId");
  const serviceId = url.searchParams.get("serviceId");
  const serviceIdsParam = url.searchParams.get("serviceIds");
  const daysRaw = Number(url.searchParams.get("days") ?? "14");
  const daysWindow = Number.isNaN(daysRaw) ? 14 : Math.min(21, Math.max(3, daysRaw));
  const serviceIds = serviceIdsParam ? serviceIdsParam.split(",").map((s) => s.trim()).filter(Boolean) : serviceId ? [serviceId] : [];

  if (!barberId || serviceIds.length === 0) {
    return NextResponse.json({ error: "Parametros invalidos" }, { status: 400 });
  }
  if (customer.preferredBarberId && customer.preferredBarberId !== barberId) {
    return NextResponse.json({ error: "Acesso permitido apenas para sua barbearia vinculada." }, { status: 403 });
  }

  const barber = await prisma.barberProfile.findUnique({ where: { id: barberId } });
  if (!barber || !isPlanActive(barber.planExpiresAt)) {
    return NextResponse.json({ error: "Barbearia com plano expirado." }, { status: 423 });
  }

  const today = dateAtBrMidnight(brTodayISO());
  const days = [];
  for (let i = 0; i < daysWindow; i++) {
    const d = addDays(today, i);
    const dateISO = format(d, "yyyy-MM-dd");
    const { slots } = await getAvailableSlots(dateISO, serviceIds, barberId);
    days.push({
      date: dateISO,
      slots: slots.length,
      firstSlot: slots[0] ?? null,
      loadLevel: slots.length === 0 ? "full" : slots.length <= 4 ? "high" : slots.length <= 10 ? "medium" : "low",
    });
  }

  return NextResponse.json({ days });
}
