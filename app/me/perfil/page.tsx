"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, Container, Input, Label, TopNav } from "@/components/ui";

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me/profile");
      const data = await res.json();
      if (data?.user?.customer) {
        setName(data.user.customer.name ?? "");
        setPhone(data.user.customer.phone ?? "");
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setMsg("");
    const res = await fetch("/api/me/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error ?? "Erro ao salvar.");
    setMsg("Perfil atualizado com sucesso.");
  }

  return (
    <div className="page-atmosphere min-h-screen">
      <TopNav right={<Link href="/agendar"><Button>Voltar</Button></Link>} />
      <Container>
        <div className="mx-auto max-w-md py-10">
          <Card>
            <CardBody>
              <h1 className="text-2xl font-bold">Seu perfil</h1>
              <p className="mt-1 text-sm text-zinc-600">Para agendar, precisamos do seu nome e WhatsApp.</p>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="82999999999" disabled={loading} />
                </div>

                {msg && <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">{msg}</div>}

                <Button className="w-full" onClick={save} disabled={loading || name.trim().length < 2 || phone.trim().length < 8}>
                  Salvar
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </Container>
    </div>
  );
}
