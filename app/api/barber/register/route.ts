import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { PlanType, Role } from "@prisma/client";
import { calcPlanWindow, isMasterPasswordValid } from "@/lib/plans";
import { randomSuffix, toSlugBase } from "@/lib/barber-link";

const Body = z.object({
  shopName: z.string().min(2),
  phone: z.string().min(8).optional(),
  email: z.string().email(),
  password: z.string().min(6),
  planType: z.nativeEnum(PlanType),
  masterPassword: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email ja cadastrado" }, { status: 409 });
  if (!isMasterPasswordValid(parsed.data.masterPassword)) {
    return NextResponse.json({ error: "Senha mestre invalida para liberar criacao da conta." }, { status: 403 });
  }

  const planWindow = calcPlanWindow(parsed.data.planType);
  const slugBase = toSlugBase(parsed.data.shopName);
  let publicSlug = `${slugBase}-${randomSuffix(6)}`;
  for (let i = 0; i < 5; i++) {
    const existsSlug = await prisma.barberProfile.findUnique({ where: { publicSlug } });
    if (!existsSlug) break;
    publicSlug = `${slugBase}-${randomSuffix(6)}`;
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: Role.BARBER,
      barber: {
        create: {
          publicSlug,
          shopName: parsed.data.shopName,
          phone: parsed.data.phone,
          planType: parsed.data.planType,
          planPrice: planWindow.price,
          planStartsAt: planWindow.startsAt,
          planExpiresAt: planWindow.expiresAt,
          schedule: {
            create: {
              workDays: "1,2,3,4,5,6",
              startTime: "08:00",
              endTime: "20:00",
              slotMinutes: 20,
            },
          },
          services: {
            create: [
              { name: "Corte (40min)", category: "Corte", duration: 40, prepMinutes: 5, price: 3500, sortOrder: 1, active: true },
              { name: "Corte + Barba (60min)", category: "Combo", duration: 60, prepMinutes: 5, price: 5500, sortOrder: 2, active: true },
              { name: "Sobrancelha (20min)", category: "Acabamento", duration: 20, prepMinutes: 0, price: 1500, sortOrder: 3, active: true },
            ],
          },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
