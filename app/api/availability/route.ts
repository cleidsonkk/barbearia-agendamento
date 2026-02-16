import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";
import { isPlanActive } from "@/lib/plans";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id as string } });
  if (!customer) return NextResponse.json({ error: "Complete seu perfil" }, { status: 412 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const barberId = url.searchParams.get("barberId");
  const serviceId = url.searchParams.get("serviceId");
  const serviceIdsParam = url.searchParams.get("serviceIds");
  const serviceIds = serviceIdsParam ? serviceIdsParam.split(",").map((s) => s.trim()).filter(Boolean) : serviceId ? [serviceId] : [];

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !barberId || serviceIds.length === 0) {
    return NextResponse.json({ error: "Parametros invalidos" }, { status: 400 });
  }
  if (customer.preferredBarberId && customer.preferredBarberId !== barberId) {
    return NextResponse.json({ error: "Acesso permitido apenas para sua barbearia vinculada." }, { status: 403 });
  }

  const barber = await prisma.barberProfile.findUnique({ where: { id: barberId } });
  if (!barber || !isPlanActive(barber.planExpiresAt)) {
    return NextResponse.json({ error: "Barbearia com plano expirado." }, { status: 423 });
  }

  const result = await getAvailableSlots(date, serviceIds, barberId);
  return NextResponse.json({ slots: result.slots });
}
