import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isPlanActive } from "@/lib/plans";
import { buildBarberReservePath } from "@/lib/barber-link";
import { Button, Card, CardBody, Container, TopNav } from "@/components/ui";

export default async function BarberPublicPage({ params }: { params: { slug: string } }) {
  const session = (await getServerSession(authOptions)) as any;
  const barber = await prisma.barberProfile.findUnique({
    where: { publicSlug: params.slug },
    select: { id: true, shopName: true, planExpiresAt: true },
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

  const reservePath = buildBarberReservePath(params.slug);

  return (
    <div className="page-atmosphere min-h-screen">
      <TopNav
        right={
          <>
            <Link href={`/login?callbackUrl=${encodeURIComponent(reservePath)}`}><Button variant="ghost">Entrar</Button></Link>
            <Link href={`/cadastro?shop=${encodeURIComponent(params.slug)}`}><Button variant="ghost">Cadastrar</Button></Link>
          </>
        }
      />
      <Container>
        <div className="mx-auto max-w-2xl py-10">
          <Card>
            <CardBody>
              <h1 className="font-heading text-3xl font-bold text-zinc-950">Agendar em {barber.shopName}</h1>
              <p className="mt-2 text-sm text-zinc-600">Entre ou crie uma conta para agendar diretamente nesta barbearia.</p>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Se sua conta ja estiver vinculada a outra barbearia, use uma nova conta para agendar aqui.
              </div>

              {!session?.user?.id ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link href={`/login?callbackUrl=${encodeURIComponent(reservePath)}`}><Button className="w-full">Entrar para agendar</Button></Link>
                  <Link href={`/cadastro?shop=${encodeURIComponent(params.slug)}`}><Button className="w-full" variant="ghost">Criar conta</Button></Link>
                </div>
              ) : (
                <div className="mt-6">
                  <Link href={reservePath}><Button className="w-full sm:w-auto">Continuar para agendamento</Button></Link>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </Container>
    </div>
  );
}
