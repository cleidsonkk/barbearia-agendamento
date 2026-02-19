"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody } from "@/components/ui";

export function MetricsResetCard({ lastResetAt }: { lastResetAt?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function resetNow() {
    if (loading) return;
    const ok = window.confirm("Fechar periodo atual e zerar indicadores para novo ciclo?");
    if (!ok) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/dashboard/metrics/reset", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Nao foi possivel fechar o periodo.");
        return;
      }
      setMsg("Periodo fechado e relatorio salvo.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Relatorios e reset</div>
        <div className="mt-2 text-sm text-zinc-700">
          Ultimo reset: <span className="font-semibold text-zinc-900">{lastResetAt ?? "nunca"}</span>
        </div>
        <div className="mt-3">
          <Button className="w-full sm:w-auto" onClick={resetNow} disabled={loading}>
            {loading ? "Salvando..." : "Fechar semana e zerar painel"}
          </Button>
        </div>
        {msg ? <div className="mt-2 text-sm text-zinc-700">{msg}</div> : null}
      </CardBody>
    </Card>
  );
}
