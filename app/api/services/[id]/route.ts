import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBarberContext } from "@/lib/apiAuth";

const PatchBody = z.object({
  name: z.string().trim().min(2).optional(),
  category: z.string().trim().min(2).optional().nullable().or(z.literal("")),
  imageUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  duration: z.coerce.number().int().min(1).max(300).optional(),
  prepMinutes: z.coerce.number().int().min(0).max(30).optional(),
  price: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const service = await prisma.service.findUnique({ where: { id: params.id } });
  if (!service || service.barberId !== ctx.barber.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.service.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      category: parsed.data.category === "" ? null : parsed.data.category,
      imageUrl: parsed.data.imageUrl === "" ? null : parsed.data.imageUrl,
    },
  });

  return NextResponse.json({ ok: true, service: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const service = await prisma.service.findUnique({ where: { id: params.id } });
  if (!service || service.barberId !== ctx.barber.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bookingsCount = await prisma.booking.count({
    where: { serviceId: service.id },
  });

  if (bookingsCount > 0) {
    const updated = await prisma.service.update({ where: { id: params.id }, data: { active: false } });
    return NextResponse.json({
      ok: true,
      mode: "inactivated",
      message: "Servico com historico foi inativado para preservar agendamentos antigos.",
      service: updated,
    });
  }

  await prisma.service.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true, mode: "deleted", message: "Servico apagado com sucesso." });
}
