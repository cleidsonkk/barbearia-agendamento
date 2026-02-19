import { prisma } from "@/lib/prisma";

export async function buildBarberMetrics(barberId: string, from: Date, now = new Date()) {
  const bookings = await prisma.booking.findMany({
    where: { barberId, date: { gte: from }, status: "CONFIRMED" },
    include: { service: true },
  });

  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + b.service.price, 0);
  const avgTicket = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
  const byService = new Map<string, number>();
  for (const b of bookings) byService.set(b.service.name, (byService.get(b.service.name) ?? 0) + 1);
  const topService = [...byService.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
  const occupancy = Math.min(100, Math.round((totalBookings / (daysElapsed * 8)) * 100));

  const revenueByService = new Map<string, { qty: number; revenue: number }>();
  for (const b of bookings) {
    const current = revenueByService.get(b.service.name) ?? { qty: 0, revenue: 0 };
    current.qty += 1;
    current.revenue += b.service.price;
    revenueByService.set(b.service.name, current);
  }
  const revenueDetails = [...revenueByService.entries()]
    .map(([name, data]) => ({ name, qty: data.qty, revenue: data.revenue }))
    .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty || a.name.localeCompare(b.name));

  return {
    from,
    to: now,
    bookings,
    totalBookings,
    totalRevenue,
    avgTicket,
    topService,
    occupancy,
    revenueDetails,
  };
}
