"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, Container, Input, Label, TopNav } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [err, setErr] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setCallbackUrl(sp.get("callbackUrl"));
    try {
      const saved = localStorage.getItem("remember_login_email");
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErr("");
    setSubmitting(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        redirect: false,
        callbackUrl: callbackUrl ?? "/",
      });
      if (!res || res.error) return setErr("Email ou senha invalidos.");
      try {
        if (rememberEmail) {
          localStorage.setItem("remember_login_email", email.trim().toLowerCase());
        } else {
          localStorage.removeItem("remember_login_email");
        }
      } catch {}

      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await sessionRes.json();
      const role = session?.user?.role;
      const safeTarget = role === "BARBER"
        ? (callbackUrl && callbackUrl.startsWith("/dashboard") ? callbackUrl : "/dashboard")
        : (callbackUrl && !callbackUrl.startsWith("/dashboard") ? callbackUrl : "/agendar");
      router.replace(safeTarget);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-atmosphere min-h-screen">
      <TopNav right={<Link href="/cadastro"><Button variant="ghost">Criar conta</Button></Link>} />
      <Container>
        <div className="mx-auto max-w-md py-10">
          <Card>
            <CardBody>
              <h1 className="text-2xl font-bold">Entrar</h1>
              <p className="mt-1 text-sm text-zinc-600">Acesse sua conta para agendar e acompanhar seus horarios.</p>

              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" type="email" autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" type="password" autoComplete="current-password" />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Lembrar meu email neste aparelho
                </label>

                {err && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</div>}

                <Button className="w-full" type="submit" disabled={submitting || !email.trim() || !password.trim()}>
                  {submitting ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <div className="mt-5 text-sm text-zinc-600">
                Nao tem conta? <Link className="font-semibold text-zinc-900" href="/cadastro">Cadastre-se</Link>
              </div>

              <div className="mt-6 rounded-xl bg-zinc-50 p-4 text-xs text-zinc-600">
                <div>
                  Dono/barbeiro: <Link className="font-semibold text-zinc-900" href="/cadastro-barbearia">Cadastrar barbearia</Link>
                </div>
                <div className="mt-2">
                  Ja tem conta de barbeiro?{" "}
                  <Link className="font-semibold text-zinc-900" href="/login?callbackUrl=/dashboard">
                    Entrar barbeiro
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </Container>
    </div>
  );
}
