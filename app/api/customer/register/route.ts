import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { isPlanActive } from "@/lib/plans";

const Body = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email(),
  password: z.string().min(6),
  preferredBarberId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  let preferredBarberId: string | null = null;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email ja cadastrado" }, { status: 409 });

  if (parsed.data.preferredBarberId) {
    const barber = await prisma.barberProfile.findUnique({
      where: { id: parsed.data.preferredBarberId },
      select: { id: true, planExpiresAt: true },
    });
    if (!barber) return NextResponse.json({ error: "Barbearia selecionada nao encontrada." }, { status: 404 });
    if (!isPlanActive(barber.planExpiresAt)) {
      return NextResponse.json({ error: "A barbearia selecionada esta indisponivel no momento." }, { status: 423 });
    }
    preferredBarberId = barber.id;
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: Role.CUSTOMER,
      customer: {
        create: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          preferredBarberId,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
