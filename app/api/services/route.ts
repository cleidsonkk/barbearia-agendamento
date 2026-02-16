import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBarberContext, requireSession } from "@/lib/apiAuth";
import { isPlanActive } from "@/lib/plans";

const CreateBody = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(2).optional().or(z.literal("")),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  duration: z.coerce.number().int().min(1).max(300),
  prepMinutes: z.coerce.number().int().min(0).max(30).optional(),
  price: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int().optional(),
});

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const role = session.user.role as string | undefined;
  const url = new URL(req.url);
  const requestedBarberId = url.searchParams.get("barberId");
  const customer = role === "CUSTOMER"
    ? await prisma.customerProfile.findUnique({ where: { userId }, select: { preferredBarberId: true } })
    : null;
  if (role === "CUSTOMER" && customer?.preferredBarberId && requestedBarberId && requestedBarberId !== customer.preferredBarberId) {
    return NextResponse.json({ error: "Acesso permitido apenas para sua barbearia vinculada." }, { status: 403 });
  }
  const ownBarber = await prisma.barberProfile.findUnique({ where: { userId } });
  const barber = ownBarber
    ?? (requestedBarberId
      ? await prisma.barberProfile.findUnique({ where: { id: requestedBarberId } })
      : customer?.preferredBarberId
        ? await prisma.barberProfile.findUnique({ where: { id: customer.preferredBarberId } })
        : await prisma.barberProfile.findFirst());
  if (!barber) return NextResponse.json({ services: [] });

  const active = isPlanActive(barber.planExpiresAt);
  if (!active) {
    if (barber.userId === userId) {
      return NextResponse.json({ error: "Plano expirado. Renove para continuar usando o sistema." }, { status: 423 });
    }
    return NextResponse.json({ services: [] });
  }

  const isBarber = role === "BARBER" || barber.userId === userId;
  const services = await prisma.service.findMany({
    where: { barberId: barber.id, active: isBarber ? undefined : true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ services });
}

export async function POST(req: Request) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const service = await prisma.service.create({
    data: {
      barberId: ctx.barber.id,
      name: parsed.data.name,
      category: parsed.data.category ? parsed.data.category : null,
      imageUrl: parsed.data.imageUrl ? parsed.data.imageUrl : null,
      duration: parsed.data.duration,
      prepMinutes: parsed.data.prepMinutes ?? 0,
      price: parsed.data.price,
      sortOrder: parsed.data.sortOrder ?? 0,
      active: true,
    },
  });

  return NextResponse.json({ ok: true, service });
}
