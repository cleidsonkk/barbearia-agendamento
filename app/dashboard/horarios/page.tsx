"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard";
import { Button, Card, CardBody, Input, Label } from "@/components/ui";

type Schedule = {
  workDays: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  bufferMinutes: number;
  cancelHours: number;
} | null;

export default function HorariosPage() {
  const [schedule, setSchedule] = useState<Schedule>(null);
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(false);

  async function load() {
    const res = await fetch("/api/schedule");
    const data = await res.json();
    setSchedule(data.schedule ? { ...data.schedule, cancelHours: data.cancelHours ?? 2 } : null);
    setDirty(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!schedule) return;
    setMsg("");
    const res = await fetch("/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error ?? "Erro ao salvar.");
    setMsg("Horarios atualizados com sucesso.");
    setDirty(false);
    load();
  }

  return (
    <DashboardShell title="Horarios de atendimento" subtitle="Defina dias, janelas e base de slots para agendamento">
      <Card>
        <CardBody>
          {!schedule ? (
            <div className="text-sm text-zinc-600">Carregando configuracoes...</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Dias de trabalho (seg=1 ... dom=7)</Label>
                <Input
                  value={schedule.workDays}
                  onChange={(e) => {
                    setDirty(true);
                    setSchedule({ ...schedule, workDays: e.target.value });
                  }}
                />
                <div className="text-xs text-zinc-500">Padrao sugerido: 1,2,3,4,5,6</div>
              </div>
              <div className="space-y-2">
                <Label>Inicio</Label>
                <Input
                  value={schedule.startTime}
                  onChange={(e) => {
                    setDirty(true);
                    setSchedule({ ...schedule, startTime: e.target.value });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  value={schedule.endTime}
                  onChange={(e) => {
                    setDirty(true);
                    setSchedule({ ...schedule, endTime: e.target.value });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Base de slots (min)</Label>
                <Input
                  type="number"
                  value={schedule.slotMinutes}
                  onChange={(e) => {
                    setDirty(true);
                    setSchedule({ ...schedule, slotMinutes: Number(e.target.value) });
                  }}
                />
                <div className="text-xs text-zinc-500">Recomendado: 20 minutos</div>
              </div>
              <div className="space-y-2">
                <Label>Intervalo entre atendimentos (min)</Label>
                <Input
                  type="number"
                  value={schedule.bufferMinutes}
                  onChange={(e) => {
                    setDirty(true);
                    setSchedule({ ...schedule, bufferMinutes: Number(e.target.value) });
                  }}
                />
                <div className="text-xs text-zinc-500">Recomendado: 5 a 10 minutos</div>
              </div>
              <div className="space-y-2">
                <Label>Antecedencia para cancelar/remarcar (h)</Label>
                <Input
                  type="number"
                  value={schedule.cancelHours}
                  onChange={(e) => {
                    setDirty(true);
                    setSchedule({ ...schedule, cancelHours: Number(e.target.value) });
                  }}
                />
                <div className="text-xs text-zinc-500">Exemplo: 2 horas</div>
              </div>
            </div>
          )}

          {msg && <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/85 p-3 text-sm text-zinc-800">{msg}</div>}

          {dirty && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Existem alteracoes nao salvas.
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button className="w-full sm:w-auto" onClick={save} disabled={!schedule || !dirty}>
              Salvar horarios
            </Button>
          </div>
        </CardBody>
      </Card>
    </DashboardShell>
  );
}
