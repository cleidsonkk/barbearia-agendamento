import { NextResponse } from "next/server";
import { requireBarberContext } from "@/lib/apiAuth";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(req: Request) {
  const ctx = await requireBarberContext();
  if (!ctx) return NextResponse.json({ error: "Plano expirado ou acesso nao autorizado." }, { status: 423 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const serviceId = url.searchParams.get("serviceId");

  if (!date || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Parametros invalidos." }, { status: 400 });
  }

  const result = await getAvailableSlots(date, [serviceId], ctx.barber.id);
  return NextResponse.json({ slots: result.slots });
}
