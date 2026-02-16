import Image from "next/image";
import { startOfMonth } from "date-fns";
import { requireBarber } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard";
import { Card, CardBody } from "@/components/ui";
import { randomSuffix, toSlugBase } from "@/lib/barber-link";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DashboardHome() {
  const session = await requireBarber();
  let barber = await prisma.barberProfile.findUnique({ where: { userId: session.user.id as string } });
  if (barber && !barber.publicSlug) {
    const slugBase = toSlugBase(barber.shopName);
    let slug = `${slugBase}-${randomSuffix(6)}`;
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.barberProfile.findUnique({ where: { publicSlug: slug } });
      if (!exists) break;
      slug = `${slugBase}-${randomSuffix(6)}`;
    }
    barber = await prisma.barberProfile.update({ where: { id: barber.id }, data: { publicSlug: slug } });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [servicesCount, bookingsToday, closuresCount] = await Promise.all([
    barber ? prisma.service.count({ where: { barberId: barber.id, active: true } }) : Promise.resolve(0),
    barber
      ? prisma.booking.count({ where: { barberId: barber.id, date: today, status: "CONFIRMED" } })
      : Promise.resolve(0),
    barber ? prisma.shopClosure.count({ where: { barberId: barber.id } }) : Promise.resolve(0),
  ]);
  const monthFrom = startOfMonth(new Date());
  const monthBookings = barber
    ? await prisma.booking.findMany({
        where: { barberId: barber.id, date: { gte: monthFrom }, status: "CONFIRMED" },
        include: { service: true },
      })
    : [];
  const totalRevenue = monthBookings.reduce((sum, b) => sum + b.service.price, 0);
  const avgTicket = monthBookings.length > 0 ? Math.round(totalRevenue / monthBookings.length) : 0;
  const byService = new Map<string, number>();
  for (const b of monthBookings) byService.set(b.service.name, (byService.get(b.service.name) ?? 0) + 1);
  const topService = [...byService.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
  const revenueByService = new Map<string, { qty: number; revenue: number }>();
  for (const b of monthBookings) {
    const current = revenueByService.get(b.service.name) ?? { qty: 0, revenue: 0 };
    current.qty += 1;
    current.revenue += b.service.price;
    revenueByService.set(b.service.name, current);
  }
  const revenueDetails = [...revenueByService.entries()]
    .map(([name, data]) => ({ name, qty: data.qty, revenue: data.revenue }))
    .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty || a.name.localeCompare(b.name));
  const daysElapsed = Math.max(1, new Date().getDate());
  const occupancy = Math.min(100, Math.round((monthBookings.length / (daysElapsed * 8)) * 100));

  const showcase = [
    {
      title: "Ambiente premium",
      image: "/media/ambiente.jpg",
    },
    {
      title: "Corte profissional",
      image: "/media/corte.jpg",
    },
    {
      title: "Ferramentas de alta qualidade",
      image: "/media/ferramentas.jpg",
    },
  ];

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const publicLink = barber?.publicSlug ? `${baseUrl}/b/${barber.publicSlug}` : "";

  return (
    <DashboardShell title="Visao geral" subtitle="Controle rapido e elegante da sua operacao">
      <Card>
        <CardBody>
          <div className="relative overflow-hidden rounded-2xl">
            <Image
              src="/media/hero.jpg"
              alt="Barbearia profissional"
              width={1280}
              height={720}
              priority
              sizes="(max-width: 768px) 100vw, 900px"
              className="h-56 w-full object-cover sm:h-72"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
              <div className="font-heading text-2xl font-bold">Experiencia premium para seus clientes</div>
              <p className="mt-1 max-w-xl text-sm text-white/90">
                Um painel moderno com visual profissional transmite mais confianca e fortalece sua marca.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {barber ? (
        <Card>
          <CardBody>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Link exclusivo da barbearia</div>
            <div className="mt-2 rounded-xl border border-[var(--line)] bg-white/80 p-3 text-sm font-semibold text-zinc-800 break-all">
              {publicLink}
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Compartilhe este link com seus clientes. Quem abrir entra direto no fluxo da sua barbearia.
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Servicos ativos</div>
            <div className="mt-2 font-heading text-3xl font-extrabold text-zinc-950">{servicesCount}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Agenda hoje</div>
            <div className="mt-2 font-heading text-3xl font-extrabold text-zinc-950">{bookingsToday}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Fechamentos</div>
            <div className="mt-2 font-heading text-3xl font-extrabold text-zinc-950">{closuresCount}</div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody>
            <div className="font-heading text-base font-bold text-zinc-900">Padrao de atendimento</div>
            <p className="mt-2 text-sm text-zinc-600">
              Defina horarios claros e mantenha os servicos sempre atualizados para aumentar conversao no agendamento.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="font-heading text-base font-bold text-zinc-900">Canal direto</div>
            <p className="mt-2 text-sm text-zinc-600">
              Mantenha telefone e WhatsApp atualizados para facilitar confirmacoes e reduzir faltas.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Receita no mes</div>
            <div className="mt-2 font-heading text-2xl font-bold">{brl(totalRevenue)}</div>
            <details className="mt-3 rounded-xl border border-[var(--line)] bg-white/80 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                Clique para ver detalhes da receita
              </summary>
              <div className="mt-3 text-xs text-zinc-500">
                Total de atendimentos no mes: <span className="font-semibold text-zinc-800">{monthBookings.length}</span>
              </div>
              <div className="mt-2 space-y-2">
                {revenueDetails.length === 0 ? (
                  <div className="text-sm text-zinc-600">Sem atendimentos no periodo.</div>
                ) : (
                  revenueDetails.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white px-3 py-2">
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{item.name}</div>
                        <div className="text-xs text-zinc-600">{item.qty} atendimento(s)</div>
                      </div>
                      <div className="text-sm font-bold text-zinc-900">{brl(item.revenue)}</div>
                    </div>
                  ))
                )}
              </div>
            </details>
          </CardBody>
        </Card>
        <Card><CardBody><div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Ticket medio</div><div className="mt-2 font-heading text-2xl font-bold">{brl(avgTicket)}</div></CardBody></Card>
        <Card><CardBody><div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Taxa de ocupacao</div><div className="mt-2 font-heading text-2xl font-bold">{occupancy}%</div><div className="text-xs text-zinc-500">Servico mais vendido: {topService}</div></CardBody></Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {showcase.map((item) => (
          <Card key={item.title}>
            <CardBody>
              <div className="overflow-hidden rounded-2xl">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={640}
                  height={384}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="h-48 w-full object-cover transition duration-300 hover:scale-105"
                />
              </div>
              <div className="mt-3 font-heading text-sm font-bold text-zinc-900">{item.title}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
