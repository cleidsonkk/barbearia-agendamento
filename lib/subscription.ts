import { prisma } from "@/lib/prisma";
import { isPlanActive } from "@/lib/plans";

export async function getBarberSubscription(barberId: string) {
  const barber = await prisma.barberProfile.findUnique({
    where: { id: barberId },
    select: { id: true, shopName: true, planType: true, planPrice: true, planStartsAt: true, planExpiresAt: true },
  });
  if (!barber) return null;
  return {
    ...barber,
    active: isPlanActive(barber.planExpiresAt),
  };
}

export async function getBarberSubscriptionByUserId(userId: string) {
  const barber = await prisma.barberProfile.findUnique({
    where: { userId },
    select: { id: true, shopName: true, planType: true, planPrice: true, planStartsAt: true, planExpiresAt: true },
  });
  if (!barber) return null;
  return {
    ...barber,
    active: isPlanActive(barber.planExpiresAt),
  };
}

