import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBarberContext } from "@/lib/apiAuth";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const closure = await prisma.shopClosure.findUnique({ where: { id: params.id } });
  if (!closure || closure.barberId !== ctx.barber.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.shopClosure.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
