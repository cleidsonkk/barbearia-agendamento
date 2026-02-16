import Link from "next/link";
import Image from "next/image";
import { Card, CardBody, Container, Pill, TopNav, Button } from "@/components/ui";
import { HomeGallery } from "@/components/home-gallery";

export default function Home() {
  return (
    <div className="min-h-screen">
      <TopNav
        right={
          <>
            <Link href="/login" className="hidden text-sm font-semibold text-zinc-700 hover:text-zinc-950 sm:inline-flex">
              Entrar
            </Link>
            <Link href="/agendar">
              <Button>Agendar</Button>
            </Link>
          </>
        }
      />

      <main>
        <div className="home-atmosphere relative overflow-hidden">
          <Image
            src="/media/hero.jpg"
            alt="Fundo barbearia"
            fill
            priority
            sizes="100vw"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(243,237,228,0.78),rgba(236,229,216,0.82))]" />
          <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full bg-black/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-16 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
          <Container>
            <section className="relative z-10 grid gap-8 py-10 lg:grid-cols-2 lg:items-center lg:py-14">
              <div className="space-y-6">
                <div className="reveal-up flex flex-wrap gap-2">
                  <Pill>Seg-Sab 08:00-20:00</Pill>
                  <Pill>Atendimento premium</Pill>
                  <Pill>Agendamento online</Pill>
                </div>

                <div className="reveal-up reveal-delay-1 space-y-4">
                  <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-zinc-950 sm:text-5xl">
                    Sua barbearia em nivel de estudio profissional.
                  </h1>
                  <p className="max-w-xl text-lg text-[var(--muted)]">
                    Experiencia moderna, visual premium e agendamento rapido para transmitir confianca desde o primeiro clique.
                  </p>
                </div>

                <div className="reveal-up reveal-delay-2 flex flex-col gap-3 sm:flex-row">
                  <Link href="/agendar">
                    <Button className="w-full sm:w-auto">Reservar horario</Button>
                  </Link>
                  <Link href="/cadastro">
                    <Button variant="ghost" className="w-full sm:w-auto">
                      Criar conta
                    </Button>
                  </Link>
                </div>

                <div className="reveal-up reveal-delay-3 grid gap-3 sm:grid-cols-3">
                  {[
                    { t: "Servico impecavel", d: "Fluxo profissional para corte, barba e finalizacao." },
                    { t: "Sem conflitos", d: "Bloqueio automatico de horarios para evitar sobreposicao." },
                    { t: "Mobile first", d: "Experiencia fluida no celular e no computador." },
                  ].map((item) => (
                    <Card key={item.t}>
                      <CardBody>
                        <div className="font-heading text-sm font-bold uppercase tracking-wide text-zinc-900">{item.t}</div>
                        <p className="mt-2 text-sm text-zinc-600">{item.d}</p>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="reveal-up reveal-delay-2">
                <Card>
                  <CardBody>
                    <div className="hero-panel overflow-hidden rounded-3xl p-6 text-white sm:p-8">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <div className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-amber-200/90">
                            Signature Look
                          </div>
                          <h2 className="mt-2 font-heading text-2xl font-bold">Barbearia Prime</h2>
                        </div>
                        <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                          Desde 2014
                        </div>
                      </div>

                      <HomeGallery />

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="text-xl font-bold text-amber-200">4.9</div>
                          <div className="text-xs text-white/70">Avaliacao media</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="text-xl font-bold text-amber-200">+2.4k</div>
                          <div className="text-xs text-white/70">Clientes atendidos</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="text-xl font-bold text-amber-200">15min</div>
                          <div className="text-xs text-white/70">Tempo medio para agendar</div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </section>
          </Container>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] py-8">
        <Container>
          <div className="flex flex-col gap-2 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <div>(c) {new Date().getFullYear()} Barbearia Prime</div>
            <div className="flex gap-4">
              <Link href="/login" className="hover:text-zinc-900">
                Entrar
              </Link>
              <Link href="/cadastro" className="hover:text-zinc-900">
                Cadastrar
              </Link>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
