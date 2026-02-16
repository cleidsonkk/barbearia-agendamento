import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { authOptions } from "@/lib/authOptions";
import { Button, Card, CardBody, Container, TopNav } from "@/components/ui";
import TrocarContaButton from "./trocar-conta-button";

export default async function AgendarEntryPage() {
  const session = (await getServerSession(authOptions)) as any;
  const isLogged = !!session?.user?.id;
  const role = session?.user?.role as string | undefined;

  return (
    <div className="page-atmosphere min-h-screen">
      <TopNav
        right={
          <>
            <Link href="/login?callbackUrl=/agendar/reservar"><Button variant="ghost">Entrar</Button></Link>
            <Link href="/cadastro"><Button variant="ghost">Cadastrar</Button></Link>
            <Link href="/login?callbackUrl=/dashboard"><Button variant="ghost">Entrar barbeiro</Button></Link>
          </>
        }
      />
      <Container>
        <div className="mx-auto max-w-2xl py-10">
          <Card>
            <CardBody>
              <h1 className="font-heading text-3xl font-bold text-zinc-950">Agendar horario</h1>
              <p className="mt-2 text-sm text-zinc-600">
                Para agendar com seguranca, entre com a conta correta antes de continuar.
              </p>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Cada conta de cliente fica vinculada a uma unica barbearia. Para agendar em outra, crie uma nova conta de cliente.
              </div>

              {!isLogged ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <Link href="/login?callbackUrl=/agendar/reservar"><Button className="w-full">Entrar para agendar</Button></Link>
                  <Link href="/cadastro"><Button className="w-full" variant="ghost">Criar conta cliente</Button></Link>
                  <Link href="/login?callbackUrl=/dashboard"><Button className="w-full" variant="ghost">Entrar barbeiro</Button></Link>
                </div>
              ) : role === "CUSTOMER" ? (
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl border border-[var(--line)] bg-white/80 p-3 text-sm text-zinc-700">
                    Conta atual pronta para agendar.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link href="/agendar/reservar"><Button className="w-full">Continuar agendamento</Button></Link>
                    <TrocarContaButton />
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Voce esta logado como barbeiro. Para agendar como cliente, troque de conta.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link href="/dashboard"><Button className="w-full" variant="ghost">Ir para painel</Button></Link>
                    <TrocarContaButton />
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </Container>
    </div>
  );
}
