import { NextResponse } from "next/server";
import { z } from "zod";
import { PlanType } from "@prisma/client";
import { requireSession } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { calcPlanWindow, isMasterPasswordValid } from "@/lib/plans";
import { getBarberSubscription, getBarberSubscriptionByUserId } from "@/lib/subscription";

const Body = z.object({
  planType: z.nativeEnum(PlanType),
  masterPassword: z.string().min(1),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "BARBER") return NextResponse.json({ error: "Somente barbeiro." }, { status: 403 });

  const sub = await getBarberSubscriptionByUserId(session.user.id as string);
  if (!sub) return NextResponse.json({ error: "Barbearia nao encontrada." }, { status: 404 });
  return NextResponse.json({ subscription: sub });
}

export async function PUT(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "BARBER") return NextResponse.json({ error: "Somente barbeiro." }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  if (!isMasterPasswordValid(parsed.data.masterPassword)) {
    return NextResponse.json({ error: "Senha mestre invalida." }, { status: 403 });
  }

  const barber = await prisma.barberProfile.findUnique({ where: { userId: session.user.id as string } });
  if (!barber) return NextResponse.json({ error: "Barbearia nao encontrada." }, { status: 404 });

  const planWindow = calcPlanWindow(parsed.data.planType);
  await prisma.barberProfile.update({
    where: { id: barber.id },
    data: {
      planType: parsed.data.planType,
      planPrice: planWindow.price,
      planStartsAt: planWindow.startsAt,
      planExpiresAt: planWindow.expiresAt,
    },
  });

  const sub = await getBarberSubscription(barber.id);
  return NextResponse.json({ ok: true, subscription: sub });
}
