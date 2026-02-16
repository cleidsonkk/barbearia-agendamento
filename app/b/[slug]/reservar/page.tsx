import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isPlanActive } from "@/lib/plans";
import { TopNav, Button, Card, CardBody, Container } from "@/components/ui";
import AgendarUI from "@/app/agendar/ui";

export default async function BarberReservePage({ params }: { params: { slug: string } }) {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/b/${params.slug}/reservar`)}`);
  if (session.user.role === "BARBER") redirect("/dashboard");

  const barber = await prisma.barberProfile.findUnique({
    where: { publicSlug: params.slug },
    select: { id: true, shopName: true, phone: true, address: true, planExpiresAt: true },
  });

  if (!barber || !isPlanActive(barber.planExpiresAt)) {
    return (
      <div className="page-atmosphere min-h-screen">
        <TopNav />
        <Container>
          <div className="mx-auto max-w-2xl py-10">
            <Card>
              <CardBody>
                <h1 className="text-2xl font-bold">Link indisponivel</h1>
                <p className="mt-2 text-sm text-zinc-600">Esta barbearia nao esta disponivel para agendamento no momento.</p>
              </CardBody>
            </Card>
          </div>
        </Container>
      </div>
    );
  }

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.user.id as string } });
  if (!customer) redirect("/me/perfil");

  if (customer.preferredBarberId && customer.preferredBarberId !== barber.id) {
    return (
      <div className="page-atmosphere min-h-screen">
        <TopNav />
        <Container>
          <div className="mx-auto max-w-2xl py-10">
            <Card>
              <CardBody>
                <h1 className="text-2xl font-bold">Conta vinculada a outra barbearia</h1>
                <p className="mt-2 text-sm text-zinc-600">
                  Esta conta ja esta vinculada a outra barbearia. Para agendar em {barber.shopName}, crie uma nova conta de cliente.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link href={`/cadastro?shop=${encodeURIComponent(params.slug)}`}><Button className="w-full">Criar nova conta</Button></Link>
                  <Link href="/agendar"><Button className="w-full" variant="ghost">Voltar</Button></Link>
                </div>
              </CardBody>
            </Card>
          </div>
        </Container>
      </div>
    );
  }

  if (!customer.preferredBarberId) {
    await prisma.customerProfile.update({ where: { id: customer.id }, data: { preferredBarberId: barber.id } });
  }

  const services = await prisma.service.findMany({
    where: { barberId: barber.id, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="min-h-screen">
      <TopNav right={<Link href="/me"><Button variant="ghost">Meus agendamentos</Button></Link>} />
      <AgendarUI
        shops={[{ id: barber.id, shopName: barber.shopName, phone: barber.phone, address: barber.address }]}
        preferredShopId={barber.id}
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
