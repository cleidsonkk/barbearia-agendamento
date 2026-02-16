import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBarberContext } from "@/lib/apiAuth";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const block = await prisma.timeBlock.findUnique({ where: { id: params.id } });
  if (!block || block.barberId !== ctx.barber.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.timeBlock.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
