"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button, Card, CardBody, Container, Input, Label, Select, TopNav } from "@/components/ui";

type Shop = { id: string; publicSlug?: string | null; shopName: string };

export default function CadastroPage() {
  const router = useRouter();
  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [loadingShops, setLoadingShops] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const slugFromUrl = sp.get("shop");
    setShopSlug(slugFromUrl);

    async function loadShops() {
      setLoadingShops(true);
      try {
        const res = await fetch("/api/shops");
        const data = await res.json();
        const nextShops = (Array.isArray(data.shops) ? data.shops : []) as Shop[];
        setShops(nextShops);

        if (nextShops.length === 0) return;
        if (slugFromUrl) {
          const matched = nextShops.find((s) => s.publicSlug === slugFromUrl);
          setSelectedBarberId(matched?.id ?? nextShops[0].id);
          return;
        }
        setSelectedBarberId(nextShops[0].id);
      } finally {
        setLoadingShops(false);
      }
    }

    void loadShops();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErr("");
    setSubmitting(true);

    try {
      if (!selectedBarberId) {
        setErr("Selecione a barbearia para vincular sua conta.");
        return;
      }

      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          preferredBarberId: selectedBarberId,
        }),
      });

      const data = await res.json();
      if (!res.ok) return setErr(data.error ?? "Erro ao cadastrar.");

      const callbackUrl = shopSlug ? `/b/${shopSlug}/reservar` : "/agendar";
      const login = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        redirect: false,
        callbackUrl,
      });
      if (!login || login.error) return setErr("Cadastro realizado, mas nao foi possivel entrar. Tente novamente no login.");
      router.replace(callbackUrl);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
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
              {!shopSlug ? (
                <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/85 p-3 text-xs text-zinc-700">
                  Escolha a barbearia antes de criar sua conta para ja ficar vinculado corretamente.
                </div>
              ) : null}

              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label>Barbearia</Label>
                  <Select
                    value={selectedBarberId}
                    onChange={(e) => setSelectedBarberId(e.target.value)}
                    disabled={loadingShops || shops.length === 0}
                  >
                    {shops.length === 0 ? (
                      <option value="">{loadingShops ? "Carregando..." : "Nenhuma barbearia disponivel"}</option>
                    ) : (
                      shops.map((shop) => (
                        <option key={shop.id} value={shop.id}>
                          {shop.shopName}
                        </option>
                      ))
                    )}
                  </Select>
                </div>
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

                <Button
                  className="w-full"
                  type="submit"
                  disabled={submitting || !selectedBarberId || loadingShops || !name.trim() || !phone.trim() || !email.trim() || !password.trim()}
                >
                  {submitting ? "Criando conta..." : "Cadastrar e continuar"}
                </Button>
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
