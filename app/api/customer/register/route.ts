import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const Body = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });

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
        },
      },
    },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
