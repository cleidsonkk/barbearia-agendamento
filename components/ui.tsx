import Link from "next/link";
import Image from "next/image";
import React from "react";

export function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card overflow-hidden rounded-3xl shadow-[0_18px_50px_rgba(20,20,20,0.08)]">
      {children}
    </div>
  );
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-5 sm:p-7">{children}</div>;
}

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" },
) {
  const { className = "", variant = "primary", ...rest } = props;
  const base =
    "h-11 rounded-xl px-5 text-[15px] font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-zinc-950 text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] hover:-translate-y-0.5 hover:bg-zinc-800"
      : "border border-[var(--line)] bg-white/70 text-zinc-800 hover:bg-white";

  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 text-base outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-amber-300/40 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 text-base outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-amber-300/40 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[110px] w-full rounded-xl border border-[var(--line)] bg-white/80 p-3 text-base outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-amber-300/40 ${props.className ?? ""}`}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{children}</div>;
}

export function TopNav({ right }: { right?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-20 border-b border-black/5 bg-[rgba(253,251,248,0.85)] backdrop-blur">
      <Container>
        <div className="flex h-[4.5rem] items-center justify-between gap-3 sm:h-20">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/brand/logo.svg" alt="Logo" width={128} height={36} className="h-9 w-auto" priority unoptimized />
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">{right}</div>
        </div>
      </Container>
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700">
      {children}
    </span>
  );
}

export function Divider() {
  return <div className="h-px w-full bg-[var(--line)]" />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
