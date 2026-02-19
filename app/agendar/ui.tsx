"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button, Card, CardBody, Container, Input, Label, Select, Skeleton, Textarea } from "@/components/ui";
import { brDateFromISO, brTodayISO } from "@/lib/datetime";

type Shop = { id: string; shopName: string; phone?: string | null; address?: string | null };
type Svc = {
  id: string;
  name: string;
  duration: number;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  prepMinutes?: number;
};
type DaySummary = { date: string; slots: number; firstSlot: string | null; loadLevel: "full" | "high" | "medium" | "low" };

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AgendarUI({
  shops,
  services: initialServices,
  preferredShopId,
}: {
  shops: Shop[];
  services: Svc[];
  preferredShopId?: string;
}) {
  const [shopId, setShopId] = useState(preferredShopId ?? shops[0]?.id ?? "");
  const [services, setServices] = useState<Svc[]>(initialServices);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    initialServices[0]?.id ? [initialServices[0].id] : [],
  );
  const [date, setDate] = useState(() => brTodayISO());
  const [slots, setSlots] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [booking, setBooking] = useState(false);
  const slotsRequestId = useRef(0);
  const calendarRequestId = useRef(0);

  const selectedServices = useMemo(
    () => selectedServiceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as Svc[],
    [selectedServiceIds, services],
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.duration + (s.prepMinutes ?? 0), 0),
    [selectedServices],
  );
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices],
  );
  const selectedShop = useMemo(() => shops.find((s) => s.id === shopId), [shops, shopId]);

  const selectedServicesKey = useMemo(() => selectedServiceIds.join(","), [selectedServiceIds]);

  const loadServices = useCallback(async (nextShopId: string) => {
    setLoadingServices(true);
    try {
      const res = await fetch(`/api/services?barberId=${nextShopId}`);
      const data = await res.json();
      const next = Array.isArray(data.services) ? data.services : [];
      setServices(next);
      setSelectedServiceIds(next[0]?.id ? [next[0].id] : []);
      setSlots([]);
      setStartTime("");
    } finally {
      setLoadingServices(false);
    }
  }, []);

  const loadSlots = useCallback(async (nextDate?: string, nextServiceId?: string, nextShopId?: string) => {
    const d = nextDate ?? date;
    const s = nextServiceId ?? selectedServicesKey;
    const b = nextShopId ?? shopId;
    if (!d || !s || !b) {
      setSlots([]);
      return;
    }
    setMsg("");
    setStartTime("");
    setLoadingSlots(true);
    const requestId = ++slotsRequestId.current;
    try {
      const res = await fetch(`/api/availability?date=${d}&serviceIds=${encodeURIComponent(s)}&barberId=${b}`);
      const data = await res.json();
      if (requestId !== slotsRequestId.current) return;
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } finally {
      if (requestId === slotsRequestId.current) setLoadingSlots(false);
    }
  }, [date, selectedServicesKey, shopId]);

  const loadCalendar = useCallback(async (nextServiceId?: string, nextShopId?: string) => {
    const s = nextServiceId ?? selectedServicesKey;
    const b = nextShopId ?? shopId;
    if (!s || !b) {
      setDays([]);
      return;
    }
    setLoadingCalendar(true);
    const requestId = ++calendarRequestId.current;
    try {
      const res = await fetch(`/api/availability-calendar?serviceIds=${encodeURIComponent(s)}&barberId=${b}&days=10`);
      const data = await res.json();
      if (requestId !== calendarRequestId.current) return;
      setDays(Array.isArray(data.days) ? data.days : []);
    } finally {
      if (requestId === calendarRequestId.current) setLoadingCalendar(false);
    }
  }, [selectedServicesKey, shopId]);

  useEffect(() => {
    if (selectedServiceIds.length > 0 && shopId) void loadSlots();
  }, [selectedServiceIds.length, shopId, loadSlots]);

  useEffect(() => {
    if (selectedServiceIds.length > 0 && shopId) void loadCalendar();
  }, [selectedServiceIds.length, shopId, loadCalendar]);

  useEffect(() => {
    if (!shopId || selectedServiceIds.length === 0) return;
    const timer = window.setInterval(() => {
      void loadSlots();
      void loadCalendar();
    }, 20000);
    return () => window.clearInterval(timer);
  }, [shopId, selectedServiceIds.length, loadSlots, loadCalendar]);

  useEffect(() => {
    function onFocus() {
      if (!shopId || selectedServiceIds.length === 0) return;
      void loadSlots();
      void loadCalendar();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [shopId, selectedServiceIds.length, loadSlots, loadCalendar]);

  async function onShopChange(nextShopId: string) {
    setShopId(nextShopId);
    fetch("/api/me/preferred-shop", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId: nextShopId }),
    }).catch(() => {});
    await loadServices(nextShopId);
  }

  async function book() {
    setMsg("");
    setBooking(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberId: shopId, serviceIds: selectedServiceIds, date, startTime, notes }),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? "Erro ao agendar.");
      setMsg("Agendamento confirmado com sucesso.");
      if (data.waLink) window.open(data.waLink, "_blank");
      await loadSlots();
    } finally {
      setBooking(false);
    }
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) => {
      if (prev.includes(serviceId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  }

  if (shops.length === 0) {
    return (
      <main className="page-atmosphere min-h-screen">
        <Container>
          <div className="mx-auto max-w-3xl py-10">
            <Card>
              <CardBody>
                <h1 className="font-heading text-2xl font-bold text-zinc-950">Sem barbearias disponiveis</h1>
                <p className="mt-2 text-sm text-zinc-600">Nenhuma barbearia cadastrada no sistema.</p>
              </CardBody>
            </Card>
          </div>
        </Container>
      </main>
    );
  }

  if (services.length === 0) {
    return (
      <main className="page-atmosphere min-h-screen">
        <Container>
          <div className="mx-auto max-w-3xl py-10">
            <Card>
              <CardBody>
                <h1 className="font-heading text-2xl font-bold text-zinc-950">Agenda indisponivel</h1>
                <p className="mt-2 text-sm text-zinc-600">
                  A barbearia selecionada ainda nao cadastrou servicos para agendamento.
                </p>
              </CardBody>
            </Card>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="page-atmosphere min-h-screen">
      <Container>
        <div className="mx-auto max-w-6xl py-8 sm:py-10">
          <div className="mb-6 rounded-3xl border border-[var(--line)] bg-white/70 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950">Reserva premium</h1>
                <p className="mt-1 text-sm text-zinc-600">Escolha a barbearia, o servico e confirme em segundos.</p>
              </div>
              {selectedShop ? (
                <div className="rounded-2xl bg-zinc-950 px-4 py-3 text-white shadow-[0_14px_35px_rgba(0,0,0,0.24)]">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Barbearia</div>
                  <div className="mt-1 text-sm font-bold">{selectedShop.shopName}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-8">
              <Card>
                <CardBody>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Barbearia</Label>
                      <Select value={shopId} onChange={(e) => onShopChange(e.target.value)}>
                        {shops.map((s) => (
                          <option key={s.id} value={s.id}>{s.shopName}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Servicos (selecione um ou mais)</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {services.map((s) => {
                          const active = selectedServiceIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleService(s.id)}
                              className={`rounded-xl border p-3 text-left transition ${
                                active
                                  ? "border-zinc-950 bg-zinc-950 text-white"
                                  : "border-[var(--line)] bg-white/75 text-zinc-700 hover:bg-white"
                              }`}
                            >
                              <div className="text-sm font-semibold">{s.name}</div>
                              <div className={`text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                                {money(s.price)} | {s.duration} min
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                  </div>
                  {loadingServices ? <div className="mt-3 text-xs text-zinc-500">Atualizando servicos da barbearia...</div> : null}

                  {loadingCalendar ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20" />
                      ))}
                    </div>
                  ) : days.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      {days.map((d) => (
                        <button
                          key={d.date}
                          onClick={() => setDate(d.date)}
                          className={`rounded-xl border p-2 text-left text-xs ${
                            date === d.date ? "border-zinc-950 bg-zinc-950 text-white" : "border-[var(--line)] bg-white/70 text-zinc-700"
                          }`}
                        >
                          <div className="font-semibold">{brDateFromISO(d.date)}</div>
                          <div>{d.firstSlot ? `Primeiro: ${d.firstSlot}` : "Sem vagas"}</div>
                          <div>
                            Lotacao: {d.loadLevel === "low" ? "baixa" : d.loadLevel === "medium" ? "media" : d.loadLevel === "high" ? "alta" : "lotado"}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="mb-3 flex items-center justify-between">
                    <Label>Horarios disponiveis</Label>
                    <button
                      onClick={() => loadSlots()}
                      disabled={loadingSlots}
                      className="text-xs font-semibold uppercase tracking-wide text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                    >
                      {loadingSlots ? "Atualizando..." : "Atualizar"}
                    </button>
                  </div>
                  {loadingSlots ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <Skeleton key={i} className="h-11" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--line)] bg-white/75 p-4 text-sm text-zinc-600">Sem horarios livres para esta data.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {slots.map((h) => (
                        <button
                          key={h}
                          onClick={() => setStartTime(h)}
                          className={`h-11 rounded-xl border text-sm font-semibold transition ${
                            startTime === h
                              ? "border-zinc-950 bg-zinc-950 text-white shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                              : "border-[var(--line)] bg-white/75 text-zinc-700 hover:bg-white"
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="space-y-2">
                    <Label>Observacao (opcional)</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: tipo de corte, referencia..." />
                  </div>
                  {msg && <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/80 p-3 text-sm text-zinc-800">{msg}</div>}
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <Button className="w-full sm:w-auto" onClick={book} disabled={!startTime || booking || selectedServiceIds.length === 0}>
                      {booking ? "Confirmando..." : "Confirmar agendamento"}
                    </Button>
                    <Link className="w-full sm:w-auto" href="/me"><Button className="w-full sm:w-auto" variant="ghost">Meus agendamentos</Button></Link>
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="space-y-5 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
              <Card>
                <CardBody>
                  <div className="font-heading text-lg font-bold text-zinc-950">Resumo da reserva</div>
                  {selectedServices[0]?.imageUrl ? (
                    <div className="relative mt-3 h-32 overflow-hidden rounded-xl">
                      <Image src={selectedServices[0].imageUrl} alt={selectedServices[0].name} fill unoptimized sizes="(max-width: 1024px) 100vw, 320px" className="object-cover" />
                    </div>
                  ) : null}
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between"><span className="text-zinc-600">Barbearia</span><span className="font-semibold text-zinc-900">{selectedShop?.shopName ?? "-"}</span></div>
                    <div>
                      <div className="text-zinc-600">Servicos</div>
                      <div className="mt-1 space-y-1">
                        {selectedServices.length === 0 ? <div className="font-semibold text-zinc-900">-</div> : selectedServices.map((s) => (
                          <div key={s.id} className="font-semibold text-zinc-900">{s.name}</div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between"><span className="text-zinc-600">Duracao total</span><span className="font-semibold text-zinc-900">{totalDuration} min</span></div>
                    <div className="flex items-center justify-between"><span className="text-zinc-600">Horario</span><span className="font-semibold text-zinc-900">{startTime || "-"}</span></div>
                    <div className="flex items-center justify-between"><span className="text-zinc-600">Valor total</span><span className="font-semibold text-zinc-900">{selectedServices.length > 0 ? money(totalPrice) : "-"}</span></div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
