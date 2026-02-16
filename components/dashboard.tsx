"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Container } from "@/components/ui";

const DASHBOARD_ROUTES = [
  "/dashboard",
  "/dashboard/agenda",
  "/dashboard/servicos",
  "/dashboard/fechamentos",
  "/dashboard/horarios",
  "/dashboard/planos",
] as const;

function NavItem({
  href,
  label,
  active,
  onNavigate,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: (href: string) => void;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={() => onNavigate?.(href)}
      onFocus={() => onNavigate?.(href)}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-white text-zinc-950 shadow-[0_10px_30px_rgba(0,0,0,0.14)]"
          : "text-zinc-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full transition ${active ? "bg-[var(--brand)]" : "bg-zinc-500 group-hover:bg-zinc-300"}`}
      />
      {label}
    </Link>
  );
}

export function DashboardShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "Visao geral" },
      { href: "/dashboard/agenda", label: "Agenda do dia" },
      { href: "/dashboard/servicos", label: "Servicos" },
      { href: "/dashboard/fechamentos", label: "Fechar barbearia" },
      { href: "/dashboard/horarios", label: "Horarios" },
      { href: "/dashboard/planos", label: "Planos" },
    ],
    [],
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const warmRoutes = () => {
      for (const route of DASHBOARD_ROUTES) {
        if (route !== pathname) router.prefetch(route);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleWindow = window as Window & {
        requestIdleCallback: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback: (handle: number) => void;
      };
      const id = idleWindow.requestIdleCallback(warmRoutes, { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback(id);
    }
    const timer = setTimeout(warmRoutes, 120);
    return () => clearTimeout(timer);
  }, [router, pathname]);

  function onWarmRoute(href: string) {
    if (href !== pathname) router.prefetch(href);
  }

  return (
    <div className="page-atmosphere min-h-screen">
      <div className="sticky top-0 z-20 border-b border-black/5 bg-[rgba(253,251,248,0.88)] backdrop-blur">
        <Container>
          <div className="flex h-20 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOpen((v) => !v)}
                className="rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm font-semibold text-zinc-700 md:hidden"
              >
                Menu
              </button>
              <Image src="/brand/logo.svg" className="h-9 w-auto" alt="Logo" width={128} height={36} priority unoptimized />
            </div>
            <Link href="/agendar">
              <Button variant="ghost">Ver site</Button>
            </Link>
          </div>
        </Container>
      </div>

      <Container>
        <div className="grid gap-6 py-6 md:grid-cols-12 lg:gap-8">
          {open ? (
            <div className="fixed inset-0 z-40 bg-black/35 md:hidden" onClick={() => setOpen(false)} />
          ) : null}

          <aside
            className={`${
              open ? "fixed inset-y-0 left-0 z-50 w-[84%] max-w-xs p-4" : "hidden"
            } md:static md:z-auto md:block md:w-auto md:max-w-none md:p-0 md:col-span-3`}
          >
            <div className="h-full overflow-y-auto rounded-3xl bg-zinc-950 p-3 text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)] md:sticky md:top-28 md:h-auto md:overflow-visible">
              <div className="px-2 pb-3 pt-2">
                <div className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Painel</div>
                <div className="mt-1 text-sm text-zinc-300">Gestao da barbearia</div>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={pathname === item.href}
                    onNavigate={onWarmRoute}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </nav>
            </div>
          </aside>

          <section className="md:col-span-9">
            <div className="mb-5 rounded-3xl border border-[var(--line)] bg-white/75 p-5 sm:p-6">
              <div className="font-heading text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">{title}</div>
              {subtitle && <div className="mt-1 text-sm text-zinc-600">{subtitle}</div>}
            </div>
            {children}
          </section>
        </div>
      </Container>
    </div>
  );
}
