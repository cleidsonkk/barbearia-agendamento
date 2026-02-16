import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { isPlanActive } from "@/lib/plans";

const Body = z.object({
  barberId: z.string().min(1),
});

export async function PUT(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "CUSTOMER") return NextResponse.json({ error: "Somente cliente." }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });

  const barber = await prisma.barberProfile.findUnique({ where: { id: parsed.data.barberId } });
  if (!barber || !isPlanActive(barber.planExpiresAt)) {
    return NextResponse.json({ error: "Barbearia invalida ou com plano expirado." }, { status: 404 });
  }

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id as string } });
  if (!customer) return NextResponse.json({ error: "Perfil de cliente nao encontrado." }, { status: 404 });
  if (customer.preferredBarberId && customer.preferredBarberId !== parsed.data.barberId) {
    return NextResponse.json({ error: "Cliente vinculado a outra barbearia." }, { status: 409 });
  }

  const updated = await prisma.customerProfile.update({
    where: { id: customer.id },
    data: { preferredBarberId: parsed.data.barberId },
  });

  return NextResponse.json({ ok: true, preferredBarberId: updated.preferredBarberId });
}
