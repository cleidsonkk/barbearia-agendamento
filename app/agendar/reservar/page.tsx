import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import AgendarUI from "../ui";
import { TopNav, Button } from "@/components/ui";
import Link from "next/link";
import { isPlanActive } from "@/lib/plans";

export default async function AgendarReservarPage() {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user?.id) redirect("/login?callbackUrl=/agendar/reservar");
  if (session.user.role === "BARBER") redirect("/dashboard");

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id as string } });
  if (!customer) redirect("/me/perfil");

  const shopsRaw = await prisma.barberProfile.findMany({
    orderBy: { shopName: "asc" },
    select: { id: true, shopName: true, phone: true, address: true, planExpiresAt: true },
  });
  const activeShops = shopsRaw.filter((s) => isPlanActive(s.planExpiresAt)).map(({ planExpiresAt, ...s }) => s);
  const shops = customer.preferredBarberId
    ? activeShops.filter((s) => s.id === customer.preferredBarberId)
    : activeShops;
  if (shops.length === 0) redirect("/cadastro-barbearia");

  const preferredInList = customer.preferredBarberId && shops.some((s) => s.id === customer.preferredBarberId)
    ? customer.preferredBarberId
    : null;
  const initialShopId = preferredInList ?? shops[0].id;
  const services = await prisma.service.findMany({
    where: { barberId: initialShopId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="min-h-screen">
      <TopNav
        right={
          <>
            <Link href="/me"><Button variant="ghost">Meus agendamentos</Button></Link>
            <Link href="/dashboard"><Button className="hidden sm:inline-flex" variant="ghost">Painel</Button></Link>
          </>
        }
      />
      <AgendarUI
        shops={shops}
        preferredShopId={initialShopId}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          price: s.price,
          category: s.category,
          imageUrl: s.imageUrl,
          prepMinutes: s.prepMinutes,
        }))}
      />
    </div>
  );
}
