"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button, Card, CardBody, Container, Input, Label, TopNav } from "@/components/ui";

export default function CadastroPage() {
  const router = useRouter();
  const [shopSlug, setShopSlug] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setShopSlug(sp.get("shop"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    const res = await fetch("/api/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, password }),
    });

    const data = await res.json();
    if (!res.ok) return setErr(data.error ?? "Erro ao cadastrar.");

    const callbackUrl = shopSlug ? `/b/${shopSlug}/reservar` : "/agendar";
    const login = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    if (!login || login.error) return setErr("Cadastro realizado, mas nao foi possivel entrar. Tente novamente no login.");
    router.push(callbackUrl);
  }

  return (
    <div className="page-atmosphere min-h-screen">
      <TopNav right={<Link href="/login"><Button variant="ghost">Ja tenho conta</Button></Link>} />
      <Container>
        <div className="mx-auto max-w-md py-10">
          <Card>
            <CardBody>
              <h1 className="text-2xl font-bold">Criar conta</h1>
              <p className="mt-1 text-sm text-zinc-600">Crie sua conta para agendar horarios com praticidade.</p>
              {shopSlug ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Este cadastro sera usado para agendar no link da barbearia selecionada.
                </div>
              ) : null}

              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <Label>Celular/WhatsApp</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="DDD + numero (ex: 82999999999)" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" type="email" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 6 caracteres" type="password" />
                </div>

                {err && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</div>}

                <Button className="w-full" type="submit">Cadastrar e continuar</Button>
              </form>

              <div className="mt-5 text-sm text-zinc-600">
                Ja tem conta? <Link className="font-semibold text-zinc-900" href="/login">Entrar</Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </Container>
    </div>
  );
}
