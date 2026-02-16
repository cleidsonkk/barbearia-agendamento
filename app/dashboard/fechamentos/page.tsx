"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard";
import { Button, Card, CardBody, Input, Label } from "@/components/ui";

type Closure = { id: string; startAt: string; endAt: string; reason?: string };

export default function FechamentosPage() {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/closures");
    const data = await res.json();
    setClosures(data.closures ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    setMsg("");
    const res = await fetch("/api/closures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt, endAt, reason }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error ?? "Erro ao salvar.");
    setMsg("Fechamento criado com sucesso.");
    setStartAt("");
    setEndAt("");
    setReason("");
    load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/closures/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Erro ao remover fechamento.");
      return;
    }
    setMsg("Fechamento removido com sucesso.");
    setConfirmDeleteId(null);
    load();
  }

  return (
    <DashboardShell title="Fechar barbearia" subtitle="Bloqueie periodos para folga, manutencao ou eventos especiais">
      <Card>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Inicio (data/hora)</Label>
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim (data/hora)</Label>
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Motivo (opcional)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: folga / manutencao" />
            </div>
          </div>

          {msg && <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/85 p-3 text-sm text-zinc-800">{msg}</div>}

          <div className="mt-4 flex justify-end">
            <Button className="w-full sm:w-auto" onClick={add} disabled={!startAt || !endAt}>
              Criar fechamento
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-3">
        {closures.map((c) => (
          <Card key={c.id}>
            <CardBody>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-heading text-sm font-bold text-zinc-900">
                    {new Date(c.startAt).toLocaleString("pt-BR")} {"->"} {new Date(c.endAt).toLocaleString("pt-BR")}
                  </div>
                  {c.reason && <div className="mt-1 text-sm text-zinc-600">{c.reason}</div>}
                </div>
                <Button variant="ghost" onClick={() => setConfirmDeleteId(c.id)}>
                  Remover
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md">
            <Card>
              <CardBody>
                <div className="space-y-4">
                  <h3 className="font-heading text-lg font-bold text-zinc-900">Remover fechamento</h3>
                  <p className="text-sm text-zinc-600">
                    Essa acao vai liberar esse periodo para novos agendamentos. Deseja continuar?
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setConfirmDeleteId(null)}>
                      Cancelar
                    </Button>
                    <Button className="w-full sm:w-auto" onClick={() => remove(confirmDeleteId)}>
                      Confirmar remocao
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
