import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/apiAuth";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customer: true, barber: { include: { schedule: true } } },
  });

  return NextResponse.json({ user });
}

const CustomerUpdate = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
});

export async function PUT(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const parsed = CustomerUpdate.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.customerProfile.upsert({
    where: { userId },
    update: { name: parsed.data.name, phone: parsed.data.phone },
    create: { userId, name: parsed.data.name, phone: parsed.data.phone },
  });

  return NextResponse.json({ ok: true, customer: updated });
}
