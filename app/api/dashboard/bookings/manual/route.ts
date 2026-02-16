import { NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes, format, parse } from "date-fns";
import bcrypt from "bcryptjs";
import { requireBarberContext } from "@/lib/apiAuth";
import { getAvailableSlots } from "@/lib/availability";
import { dateAtBrMidnight, toBrDate } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  serviceId: z.string().min(1),
  customerId: z.string().optional(),
  customerName: z.string().trim().min(2).max(80).optional(),
  customerPhone: z.string().trim().min(10).max(30).optional(),
  notes: z.string().trim().max(400).optional(),
});

function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  if (digits.length < 10 || digits.length > 11) return null;
  return digits;
}

function customerEmailForBarber(barberId: string, phone: string) {
  return `manual-${barberId}-${phone}-${Date.now()}-${Math.floor(Math.random() * 10000)}@clientes.local`;
}

async function resolveCustomer(params: {
  barberId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
}) {
  if (params.customerId) {
    const existing = await prisma.customerProfile.findUnique({ where: { id: params.customerId } });
    if (!existing) return { error: "Cliente selecionado nao foi encontrado.", status: 404 } as const;
    if (existing.preferredBarberId && existing.preferredBarberId !== params.barberId) {
      return { error: "Cliente vinculado a outra barbearia.", status: 403 } as const;
    }
    if (!existing.preferredBarberId) {
      await prisma.customerProfile.update({ where: { id: existing.id }, data: { preferredBarberId: params.barberId } });
    }
    return { customer: existing } as const;
  }

  if (!params.customerName || !params.customerPhone) {
    return { error: "Informe cliente existente ou nome + WhatsApp.", status: 400 } as const;
  }
  const customerName = params.customerName;

  const normalizedPhone = normalizePhone(params.customerPhone);
  if (!normalizedPhone) {
    return { error: "WhatsApp invalido. Use DDD + numero.", status: 400 } as const;
  }

  const existingByPhone = await prisma.customerProfile.findFirst({
    where: {
      phone: normalizedPhone,
      OR: [{ preferredBarberId: null }, { preferredBarberId: params.barberId }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingByPhone) {
    const customer = existingByPhone.preferredBarberId
      ? existingByPhone
      : await prisma.customerProfile.update({
          where: { id: existingByPhone.id },
          data: { preferredBarberId: params.barberId, name: customerName },
        });
    return { customer } as const;
  }

  const created = await prisma.$transaction(async (tx) => {
    const password = await bcrypt.hash(`manual:${normalizedPhone}:${Date.now()}`, 10);
    const user = await tx.user.create({
      data: {
        email: customerEmailForBarber(params.barberId, normalizedPhone),
        password,
        role: "CUSTOMER",
      },
    });
    return tx.customerProfile.create({
      data: {
        userId: user.id,
        name: customerName,
        phone: normalizedPhone,
        preferredBarberId: params.barberId,
      },
    });
  });

  return { customer: created } as const;
}

export async function POST(req: Request) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, barberId: ctx.barber.id, active: true },
  });
  if (!service) return NextResponse.json({ error: "Servico invalido para esta barbearia." }, { status: 400 });

  const customerResult = await resolveCustomer({
    barberId: ctx.barber.id,
    customerId: parsed.data.customerId,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
  });
  if ("error" in customerResult) {
    return NextResponse.json({ error: customerResult.error }, { status: customerResult.status });
  }
  const customer = customerResult.customer;

  if (customer.blockedUntil && customer.blockedUntil > new Date()) {
    return NextResponse.json(
      { error: `Cliente bloqueado temporariamente por faltas. Libera em ${toBrDate(customer.blockedUntil)}.` },
      { status: 423 },
    );
  }

  const availability = await getAvailableSlots(parsed.data.date, [service.id], ctx.barber.id);
  if (!availability.slots.includes(parsed.data.startTime)) {
    return NextResponse.json({ error: "Horario indisponivel. Atualize os horarios e tente outro slot." }, { status: 409 });
  }

  const date = dateAtBrMidnight(parsed.data.date);
  const schedule = await prisma.scheduleRule.findUnique({ where: { barberId: ctx.barber.id }, select: { bufferMinutes: true } });
  const bufferMinutes = schedule?.bufferMinutes ?? 0;
  const start = parse(parsed.data.startTime, "HH:mm", date);
  const end = addMinutes(start, service.duration + (service.prepMinutes ?? 0) + bufferMinutes);

  try {
    const booking = await prisma.booking.create({
      data: {
        barberId: ctx.barber.id,
        customerId: customer.id,
        serviceId: service.id,
        date,
        startTime: format(start, "HH:mm"),
        endTime: format(end, "HH:mm"),
        notes: parsed.data.notes || null,
      },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true, price: true } },
      },
    });
    return NextResponse.json({ ok: true, booking });
  } catch {
    return NextResponse.json({ error: "Conflito de horario. Escolha outro slot." }, { status: 409 });
  }
}
