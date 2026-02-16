import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isPlanActive } from "@/lib/plans";

export async function requireSession() {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user?.id) return null;
  return session;
}

export async function requireBarberContext(opts?: { skipPlanCheck?: boolean }) {
  const session = await requireSession();
  if (!session || session.user.role !== "BARBER") return null;

  const barber = await prisma.barberProfile.findUnique({ where: { userId: session.user.id as string } });
  if (!barber) return null;
  if (!opts?.skipPlanCheck && !isPlanActive(barber.planExpiresAt)) return null;

  return { session, barber };
}
