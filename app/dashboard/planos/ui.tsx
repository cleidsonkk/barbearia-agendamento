"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard";
import { Button, Card, CardBody, Input, Label, Select } from "@/components/ui";

type PlanType = "TRIAL" | "MONTHLY" | "QUARTERLY" | "YEARLY";
type Subscription = {
  id: string;
  shopName: string;
  planType: PlanType;
  planPrice: number;
  planStartsAt: string;
  planExpiresAt: string | null;
  active?: boolean;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const plans: Array<{ value: PlanType; label: string; priceLabel: string }> = [
  { value: "TRIAL", label: "Teste 7 dias", priceLabel: "Gratis" },
  { value: "MONTHLY", label: "Mensal", priceLabel: "R$ 200,00" },
  { value: "QUARTERLY", label: "3 meses", priceLabel: "R$ 500,00" },
  { value: "YEARLY", label: "Anual", priceLabel: "R$ 1.200,00" },
];

export default function PlanosClient() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [planType, setPlanType] = useState<PlanType>("MONTHLY");
  const [masterPassword, setMasterPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedPlan = useMemo(() => plans.find((p) => p.value === planType), [planType]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/plans");
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Erro ao carregar plano.");
      setLoading(false);
      return;
    }
    setSub(data.subscription ?? null);
    setPlanType((data.subscription?.planType as PlanType) ?? "MONTHLY");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setMsg("");
    setSaving(true);
    const res = await fetch("/api/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planType, masterPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Nao foi possivel atualizar plano.");
      setSaving(false);
      return;
    }
    setSub(data.subscription ?? null);
    setMasterPassword("");
    setMsg("Plano validado com sucesso. Renovacao/alteracao aplicada.");
    setSaving(false);
  }

  return (
    <DashboardShell
      title="Planos da barbearia"
      subtitle="Quando o plano expira, o sistema e bloqueado ate nova validacao com senha mestre"
    >
      <Card>
        <CardBody>
          {loading ? (
            <div className="text-sm text-zinc-600">Carregando plano atual...</div>
          ) : !sub ? (
            <div className="text-sm text-zinc-600">Plano nao encontrado para esta conta.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--line)] bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Plano atual</div>
                <div className="mt-1 font-heading text-xl font-bold text-zinc-900">{plans.find((p) => p.value === sub.planType)?.label ?? sub.planType}</div>
                <div className="mt-1 text-sm text-zinc-600">Valor: {money(sub.planPrice)}</div>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Vencimento</div>
                <div className="mt-1 font-heading text-xl font-bold text-zinc-900">
                  {sub.planExpiresAt ? new Date(sub.planExpiresAt).toLocaleDateString("pt-BR") : "-"}
                </div>
                <div className={`mt-1 text-sm ${sub.active ? "text-emerald-700" : "text-red-700"}`}>
                  {sub.active ? "Ativo" : "Expirado - sistema bloqueado"}
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Selecionar plano</Label>
              <Select value={planType} onChange={(e) => setPlanType(e.target.value as PlanType)}>
                {plans.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} - {p.priceLabel}
                  </option>
                ))}
              </Select>
              <div className="text-xs text-zinc-500">Plano escolhido: {selectedPlan?.label} ({selectedPlan?.priceLabel})</div>
            </div>
            <div className="space-y-2">
              <Label>Senha mestre para validar</Label>
              <Input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Digite a senha mestre"
              />
            </div>
          </div>

          {msg ? <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/80 p-3 text-sm text-zinc-800">{msg}</div> : null}

          <div className="mt-4 flex justify-end">
            <Button className="w-full sm:w-auto" onClick={save} disabled={!masterPassword || saving}>
              {saving ? "Validando..." : "Renovar ou alterar plano"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </DashboardShell>
  );
}
