"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button, Card, CardBody, Container, Input, Skeleton, TopNav } from "@/components/ui";

type Booking = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  customerConfirmedAt?: string | null;
  service: { name: string; price: number; duration: number };
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function brDate(iso: string) {
  return format(new Date(iso), "dd/MM/yyyy");
}

export default function MePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [reDate, setReDate] = useState<Record<string, string>>({});
  const [reTime, setReTime] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/me/bookings");
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function runAction(id: string, payload: Record<string, string>) {
    setMsg("");
    setProcessingId(id);
    try {
      const res = await fetch(`/api/me/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error ?? "Operacao nao concluida.");
      setMsg("Atualizacao realizada com sucesso.");
      await load();
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="page-atmosphere min-h-screen">
      <TopNav right={<Link href="/agendar"><Button>Agendar</Button></Link>} />
      <Container>
        <div className="mx-auto max-w-4xl py-8">
          <h1 className="font-heading text-2xl font-bold">Meus agendamentos</h1>
          <p className="mt-1 text-sm text-zinc-600">Confirme presenca, cancele ou remarque com antecedencia.</p>
          {msg ? (
            <Card>
              <CardBody>
                <div className="text-sm text-zinc-700">{msg}</div>
              </CardBody>
            </Card>
          ) : null}

          <div className="mt-6 grid gap-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardBody>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-2 h-4 w-64" />
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      <Skeleton className="h-11" />
                      <Skeleton className="h-11" />
                      <Skeleton className="h-11" />
                      <Skeleton className="h-11 lg:col-span-2" />
                    </div>
                  </CardBody>
                </Card>
              ))
            ) : bookings.length === 0 ? (
              <Card><CardBody><div className="text-sm text-zinc-700">Nenhum agendamento ainda.</div></CardBody></Card>
            ) : (
              bookings.map((b) => (
                <Card key={b.id}>
                  <CardBody>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-bold">{b.service.name}</div>
                          <div className="text-sm text-zinc-600">{brDate(b.date)} - {b.startTime} as {b.endTime}</div>
                          <div className="text-xs text-zinc-500">
                            Status: {b.status} | Presenca confirmada: {b.customerConfirmedAt ? "sim" : "nao"}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{money(b.service.price)}</div>
                      </div>

                      {b.status === "CONFIRMED" ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                          <Button className="w-full" variant="ghost" onClick={() => runAction(b.id, { action: "confirm" })} disabled={processingId === b.id}>
                            {processingId === b.id ? "Processando..." : "Confirmar presenca"}
                          </Button>
                          <Button className="w-full" variant="ghost" onClick={() => runAction(b.id, { action: "cancel" })} disabled={processingId === b.id}>
                            {processingId === b.id ? "Processando..." : "Cancelar"}
                          </Button>
                          <Input
                            type="date"
                            value={reDate[b.id] ?? ""}
                            onChange={(e) => setReDate((v) => ({ ...v, [b.id]: e.target.value }))}
                          />
                          <div className="flex gap-2 lg:col-span-2">
                            <Input
                              type="time"
                              value={reTime[b.id] ?? ""}
                              onChange={(e) => setReTime((v) => ({ ...v, [b.id]: e.target.value }))}
                            />
                            <Button
                              className="w-full sm:w-auto"
                              disabled={processingId === b.id}
                              onClick={() =>
                                runAction(b.id, {
                                  action: "reschedule",
                                  date: reDate[b.id] ?? "",
                                  startTime: reTime[b.id] ?? "",
                                })
                              }
                            >
                              {processingId === b.id ? "Processando..." : "Remarcar"}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
