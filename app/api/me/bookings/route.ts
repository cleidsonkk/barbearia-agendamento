import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id as string } });
  if (!customer) return NextResponse.json({ bookings: [] });

  const bookings = await prisma.booking.findMany({
    where: { customerId: customer.id },
    include: { service: true },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });

  return NextResponse.json({ bookings });
}
