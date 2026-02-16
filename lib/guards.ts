import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { getBarberSubscriptionByUserId } from "@/lib/subscription";

export async function requireBarber(opts?: { skipPlanCheck?: boolean }) {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  if (session.user.role !== "BARBER") redirect("/agendar");
  if (!opts?.skipPlanCheck) {
    const sub = await getBarberSubscriptionByUserId(session.user.id as string);
    if (!sub?.active) redirect("/dashboard/planos");
  }
  return session;
}
