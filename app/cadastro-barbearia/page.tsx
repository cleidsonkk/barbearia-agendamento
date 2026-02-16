"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button, Card, CardBody, Container, Input, Label, Select, TopNav } from "@/components/ui";

type PlanType = "TRIAL" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export default function CadastroBarbeariaPage() {
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planType, setPlanType] = useState<PlanType>("TRIAL");
  const [masterPassword, setMasterPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    const res = await fetch("/api/barber/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName, phone, email, password, planType, masterPassword }),
    });

    const data = await res.json();
    if (!res.ok) return setErr(data.error ?? "Erro ao cadastrar barbearia.");

    const login = await signIn("credentials", { email, password, redirect: false });
    if (!login || login.error) return setErr("Cadastro realizado, mas nao foi possivel entrar. Tente novamente no login.");
    router.push("/dashboard");
  }

  return (
    <div className="page-atmosphere min-h-screen">
      <TopNav right={<Link href="/login"><Button variant="ghost">Voltar</Button></Link>} />
      <Container>
        <div className="mx-auto max-w-md py-10">
          <Card>
            <CardBody>
              <h1 className="text-2xl font-bold">Cadastrar Barbearia</h1>
              <p className="mt-1 text-sm text-zinc-600">Cadastre sua barbearia, escolha um plano e acesse o painel profissional.</p>

              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label>Nome da barbearia</Label>
                  <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Ex: Barbearia do Centro" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp do barbeiro (opcional)</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="82999999999" />
                </div>
                <div className="space-y-2">
                  <Label>Email (login)</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@barbearia.com" type="email" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 6 caracteres" type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select value={planType} onChange={(e) => setPlanType(e.target.value as PlanType)}>
                    <option value="TRIAL">Teste 7 dias - Gratis</option>
                    <option value="MONTHLY">Mensal - R$ 200,00</option>
                    <option value="QUARTERLY">3 meses - R$ 500,00</option>
                    <option value="YEARLY">Anual - R$ 1.200,00</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Senha mestre (aprovacao)</Label>
                  <Input
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Digite a senha mestre"
                    type="password"
                  />
                </div>

                {err && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</div>}

                <Button className="w-full" type="submit" disabled={!shopName || !email || !password || !masterPassword}>
                  Cadastrar e abrir painel
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </Container>
    </div>
  );
}
