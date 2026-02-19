"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard";
import { Button, Card, CardBody, Input, Label, Select, Skeleton, Textarea } from "@/components/ui";
import { brTodayISO, brDateFromISO } from "@/lib/datetime";

type Item = {
  id: string;
  startTime: string;
  endTime: string;
  customerConfirmedAt?: string | null;
  reminderSentAt?: string | null;
  service: { name: string; price: number; duration: number };
  customer: { id?: string; name: string; phone: string; noShowCount?: number };
};

type Service = { id: string; name: string; duration: number; price: number; prepMinutes?: number };
type Customer = { id: string; name: string; phone: string };

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function wa(phone: string, msg: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  return `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`;
}

function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  return digits;
}

function base64UrlToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export default function AgendaPage() {
  const [date, setDate] = useState(() => brTodayISO());
  const [items, setItems] = useState<Item[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [barberId, setBarberId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [customerMode, setCustomerMode] = useState<"existing" | "manual">("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [supportsNotifications, setSupportsNotifications] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [subscribingPush, setSubscribingPush] = useState(false);
  const loadRequestId = useRef(0);
  const slotsRequestId = useRef(0);
  const knownBookingIds = useRef<Set<string>>(new Set());

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const requestId = ++loadRequestId.current;
    try {
      const res = await fetch(`/api/dashboard/bookings?date=${date}`);
      const data = await res.json();
      if (requestId !== loadRequestId.current) return;
      const nextItems = Array.isArray(data.bookings) ? data.bookings : [];
      const nextIds = new Set<string>(nextItems.map((b: Item) => b.id));
      const isFirstLoad = knownBookingIds.current.size === 0;

      if (!isFirstLoad) {
        const newOnes = nextItems.filter((b: Item) => !knownBookingIds.current.has(b.id));
        if (newOnes.length > 0) {
          const first = newOnes[0];
          setMsg(`Novo agendamento: ${first.customer.name} as ${first.startTime}.`);
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("Novo agendamento recebido", {
                body: `${first.customer.name} - ${first.startTime} (${brDateFromISO(date)})`,
              });
            } catch {}
          }
        }
      }

      knownBookingIds.current = nextIds;
      setItems(nextItems);
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, [date]);

  const loadSetup = useCallback(async () => {
    setLoadingSetup(true);
    try {
      const [servicesRes, customersRes] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/dashboard/customers"),
      ]);
      const servicesData = await servicesRes.json();
      const customersData = await customersRes.json();
      const nextServices = Array.isArray(servicesData.services) ? servicesData.services : [];
      const nextCustomers = Array.isArray(customersData.customers) ? customersData.customers : [];
      setServices(nextServices);
      setCustomers(nextCustomers);
      setBarberId(customersData.barberId ?? "");
      setServiceId(nextServices[0]?.id ?? "");
      setSelectedCustomerId(nextCustomers[0]?.id ?? "");
      if (!nextCustomers[0]) setCustomerMode("manual");
    } finally {
      setLoadingSetup(false);
    }
  }, []);

  const loadSlots = useCallback(async (nextServiceId?: string, nextDate?: string) => {
    const sid = nextServiceId ?? serviceId;
    const d = nextDate ?? date;
    if (!sid || !d) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setStartTime("");
    const requestId = ++slotsRequestId.current;
    try {
      const res = await fetch(`/api/dashboard/availability?date=${d}&serviceId=${sid}`);
      const data = await res.json();
      if (requestId !== slotsRequestId.current) return;
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } finally {
      if (requestId === slotsRequestId.current) setLoadingSlots(false);
    }
  }, [serviceId, date]);

  async function markNoShow(id: string) {
    setMsg("");
    setMarkingId(id);
    try {
      const res = await fetch(`/api/dashboard/bookings/${id}/no-show`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? "Erro ao marcar falta.");
      setMsg("Falta registrada com sucesso.");
      await load();
    } finally {
      setMarkingId(null);
    }
  }

  async function sendReminder(id: string) {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    setSendingReminderId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/dashboard/bookings/${id}/reminder`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (popup && !popup.closed) popup.close();
        return setMsg(data.error ?? "Nao foi possivel montar lembrete.");
      }
      if (data.waLink) {
        if (popup && !popup.closed) {
          popup.location.href = data.waLink;
        } else {
          window.location.href = data.waLink;
        }
      } else if (popup && !popup.closed) {
        popup.close();
      }
      setMsg("Lembrete preparado no WhatsApp.");
      await load();
    } finally {
      setSendingReminderId(null);
    }
  }

  async function createManualBooking() {
    if (!serviceId || !startTime) return;
    setSaving(true);
    setMsg("");
    try {
      const payload: Record<string, string> = {
        date,
        startTime,
        serviceId,
      };
      if (notes.trim()) payload.notes = notes.trim();
      if (customerMode === "existing" && selectedCustomerId) {
        payload.customerId = selectedCustomerId;
      } else {
        payload.customerName = customerName.trim();
        payload.customerPhone = normalizePhone(customerPhone);
      }

      const res = await fetch("/api/dashboard/bookings/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? "Erro ao criar agendamento.");

      setMsg("Agendamento criado com sucesso.");
      setNotes("");
      if (customerMode === "manual") {
        setCustomerName("");
        setCustomerPhone("");
      }
      await Promise.all([load(), loadSetup(), loadSlots(serviceId, date)]);
    } finally {
      setSaving(false);
    }
  }

  async function enablePushNotifications() {
    setSubscribingPush(true);
    try {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setMsg("Este dispositivo nao suporta notificacoes push.");
        return;
      }
      if (Notification.permission === "denied") {
        setMsg("Notificacoes bloqueadas no navegador. Permita nas configuracoes do site.");
        return;
      }
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setMsg("Permita notificacoes para receber novos agendamentos.");
          return;
        }
      }

      const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData?.enabled || !keyData?.publicKey) {
        setMsg("Push ainda nao configurado no servidor.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing
        ?? (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(String(keyData.publicKey)),
        }));

      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!saveRes.ok) {
        setMsg("Nao foi possivel ativar o push neste dispositivo.");
        return;
      }

      setPushEnabled(true);
      setMsg("Push ativado. Novos agendamentos vao notificar neste dispositivo.");
    } finally {
      setSubscribingPush(false);
    }
  }

  useEffect(() => {
    void loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!serviceId || !barberId) return;
    void loadSlots(serviceId, date);
  }, [serviceId, date, barberId, loadSlots]);

  useEffect(() => {
    setSupportsNotifications(typeof window !== "undefined" && "Notification" in window);
  }, []);

  useEffect(() => {
    async function checkPush() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!registration) return;
      const sub = await registration.pushManager.getSubscription();
      setPushEnabled(!!sub);
    }
    void checkPush();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
      if (serviceId && barberId) void loadSlots(serviceId, date);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [load, loadSlots, serviceId, barberId, date]);

  useEffect(() => {
    function onFocus() {
      void load();
      if (serviceId && barberId) void loadSlots(serviceId, date);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load, loadSlots, serviceId, barberId, date]);

  useEffect(() => {
    if (customerMode !== "existing" && selectedCustomer) {
      setCustomerName(selectedCustomer.name);
      setCustomerPhone(selectedCustomer.phone);
    }
  }, [customerMode, selectedCustomer]);

  return (
    <DashboardShell title="Agenda do dia" subtitle="Agenda fluida para desktop e celular, com agendamento manual e lembrete em um clique">
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <Card>
            <CardBody>
              <div className="space-y-3">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                {supportsNotifications ? (
                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={enablePushNotifications}
                    disabled={subscribingPush}
                  >
                    {pushEnabled ? "Push ativo neste dispositivo" : (subscribingPush ? "Ativando push..." : "Ativar notificacoes push")}
                  </Button>
                ) : null}
                <Button className="w-full" onClick={load}>
                  Atualizar agenda
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="xl:col-span-8">
          <Card>
            <CardBody>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="font-heading text-base font-bold text-zinc-950">Agendar para cliente (barbeiro)</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{brDateFromISO(date)}</div>
              </div>

              {loadingSetup ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-11" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Servico</Label>
                      <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.duration}min)
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Horario</Label>
                      <Select value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={loadingSlots || slots.length === 0}>
                        <option value="">{loadingSlots ? "Carregando..." : "Selecione um horario"}</option>
                        {slots.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Cliente</Label>
                      <Select value={customerMode} onChange={(e) => setCustomerMode(e.target.value as "existing" | "manual")}>
                        <option value="existing">Selecionar existente</option>
                        <option value="manual">Adicionar manualmente</option>
                      </Select>
                    </div>
                    {customerMode === "existing" ? (
                      <div>
                        <Label>Lista de clientes</Label>
                        <Select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} disabled={customers.length === 0}>
                          <option value="">{customers.length ? "Selecione" : "Nenhum cliente encontrado"}</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} - {c.phone}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label>Nome do cliente</Label>
                          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex: Joao Silva" />
                        </div>
                        <div>
                          <Label>WhatsApp do cliente</Label>
                          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="DDD + numero" />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-3">
                    <Label>Observacao</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={createManualBooking}
                      disabled={
                        saving
                        || !serviceId
                        || !startTime
                        || (customerMode === "existing" ? !selectedCustomerId : !customerName.trim() || !customerPhone.trim())
                      }
                    >
                      {saving ? "Salvando..." : "Criar agendamento"}
                    </Button>
                    <Button className="w-full sm:w-auto" variant="ghost" onClick={() => loadSlots(serviceId, date)} disabled={loadingSlots}>
                      {loadingSlots ? "Atualizando horarios..." : "Atualizar horarios"}
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {msg ? (
          <Card>
            <CardBody>
              <div className="text-sm text-zinc-700">{msg}</div>
            </CardBody>
          </Card>
        ) : null}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardBody>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-3 h-4 w-64" />
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Skeleton className="h-11" />
                  <Skeleton className="h-11" />
                  <Skeleton className="h-11" />
                </div>
              </CardBody>
            </Card>
          ))
        ) : items.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-sm text-zinc-600">Sem agendamentos para esta data.</div>
            </CardBody>
          </Card>
        ) : (
          items.map((b) => (
            <Card key={b.id}>
              <CardBody>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="font-heading text-base font-bold text-zinc-950">
                      {b.startTime} - {b.endTime} | {b.service.name}
                    </div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Cliente: <span className="font-semibold text-zinc-900">{b.customer.name}</span> | {b.customer.phone}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Presenca confirmada: {b.customerConfirmedAt ? "sim" : "nao"} | Faltas do cliente: {b.customer.noShowCount ?? 0}
                      {" | "}
                      Lembrete enviado: {b.reminderSentAt ? "sim" : "nao"}
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:w-auto">
                    <div className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-800">{money(b.service.price)}</div>
                    <a
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-auto"
                      href={wa(
                        b.customer.phone,
                        `Prezado(a) ${b.customer.name}, confirmamos seu agendamento para ${brDateFromISO(date)} as ${b.startTime}.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Chamar no WhatsApp
                    </a>
                    <Button className="w-full sm:w-auto" onClick={() => sendReminder(b.id)} disabled={sendingReminderId === b.id}>
                      {sendingReminderId === b.id ? "Gerando..." : "Enviar lembrete"}
                    </Button>
                    <Button className="w-full sm:w-auto" variant="ghost" onClick={() => markNoShow(b.id)} disabled={markingId === b.id}>
                      {markingId === b.id ? "Marcando..." : "Marcar falta"}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
