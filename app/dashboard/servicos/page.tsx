"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard";
import { Button, Card, CardBody, Input, Label } from "@/components/ui";

type Svc = {
  id: string;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  duration: number;
  prepMinutes?: number;
  price: number;
  active: boolean;
  sortOrder: number;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ServicosPage() {
  const [services, setServices] = useState<Svc[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [duration, setDuration] = useState(40);
  const [prepMinutes, setPrepMinutes] = useState(0);
  const [priceText, setPriceText] = useState("35,00");
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editDuration, setEditDuration] = useState(40);
  const [editPrepMinutes, setEditPrepMinutes] = useState(0);
  const [editPriceText, setEditPriceText] = useState("35,00");
  const [deleteTarget, setDeleteTarget] = useState<Svc | null>(null);
  const [uploadingAdd, setUploadingAdd] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  async function load() {
    const res = await fetch("/api/services");
    const data = await res.json();
    setServices(data.services ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    setMsg("");
    const normalized = priceText.replace(/\s/g, "").replace(",", ".");
    const priceNumber = Number(normalized);
    const price = Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : NaN;
    if (!Number.isFinite(price) || price < 0) {
      setMsg("Informe um valor valido. Exemplo: 35,00");
      return;
    }
    const normalizedCategory = category.trim();
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category: normalizedCategory || undefined,
        imageUrl,
        duration,
        prepMinutes,
        price,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error ?? "Erro ao salvar.");
    setName("");
    setCategory("");
    setImageUrl("");
    setDuration(40);
    setPrepMinutes(0);
    setPriceText("35,00");
    setMsg("Servico adicionado com sucesso.");
    load();
  }

  async function disable(id: string) {
    setMsg("");
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Erro ao apagar servico.");
      return;
    }
    setMsg(data.message ?? "Servico removido.");
    load();
  }

  function startEdit(s: Svc) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditCategory(s.category ?? "");
    setEditImageUrl(s.imageUrl ?? "");
    setEditDuration(s.duration);
    setEditPrepMinutes(s.prepMinutes ?? 0);
    setEditPriceText((s.price / 100).toFixed(2).replace(".", ","));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setMsg("");
    const normalized = editPriceText.replace(/\s/g, "").replace(",", ".");
    const priceNumber = Number(normalized);
    const price = Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : NaN;
    if (!Number.isFinite(price) || price < 0) {
      setMsg("Informe um valor valido para salvar.");
      return;
    }

    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        category: editCategory || null,
        imageUrl: editImageUrl || null,
        duration: editDuration,
        prepMinutes: editPrepMinutes,
        price,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Erro ao editar servico.");
      return;
    }
    setEditingId(null);
    setMsg("Servico atualizado com sucesso.");
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await disable(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function uploadServiceImage(file: File, mode: "add" | "edit") {
    if (!file) return;
    setMsg("");
    if (mode === "add") setUploadingAdd(true);
    if (mode === "edit") setUploadingEdit(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/service-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Falha ao enviar imagem.");
        return;
      }
      const url = String(data.url ?? "");
      if (!url) {
        setMsg("Falha ao receber URL da imagem.");
        return;
      }
      if (mode === "add") setImageUrl(url);
      if (mode === "edit") setEditImageUrl(url);
      setMsg("Imagem enviada com sucesso.");
    } finally {
      if (mode === "add") setUploadingAdd(false);
      if (mode === "edit") setUploadingEdit(false);
    }
  }

  return (
    <DashboardShell title="Servicos" subtitle="Monte um cardapio premium com preco e duracao claros">
      <Card>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-6">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome do servico</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Corte tradicional (40 min)" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Corte" />
            </div>
            <div className="space-y-2">
              <Label>Duracao (min)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Preparacao (min)</Label>
              <Input type="number" value={prepMinutes} onChange={(e) => setPrepMinutes(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="35,00" />
              <div className="text-xs text-zinc-500">Exemplo: 35,00</div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Foto por link (opcional)</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Foto da galeria/computador</Label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadServiceImage(file, "add");
                  e.currentTarget.value = "";
                }}
                className="h-11 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
              />
              <div className="text-xs text-zinc-500">
                {uploadingAdd ? "Enviando imagem..." : "Use JPG, PNG ou WEBP ate 5MB."}
              </div>
            </div>
            {imageUrl ? (
              <div className="md:col-span-2">
                <div className="relative h-20 w-32 overflow-hidden rounded-lg border border-[var(--line)]">
                  <Image src={imageUrl} alt="Preview do servico" fill unoptimized sizes="128px" className="object-cover" />
                </div>
              </div>
            ) : null}
          </div>
          {msg && <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/85 p-3 text-sm text-zinc-800">{msg}</div>}
          <div className="mt-4 flex">
            <Button className="w-full sm:w-auto" onClick={add} disabled={name.trim().length < 2}>
              Adicionar servico
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-3">
        {services.map((s) => (
          <Card key={s.id}>
            <CardBody>
              {editingId === s.id ? (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duracao</Label>
                    <Input type="number" value={editDuration} onChange={(e) => setEditDuration(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Preparacao</Label>
                    <Input type="number" value={editPrepMinutes} onChange={(e) => setEditPrepMinutes(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input value={editPriceText} onChange={(e) => setEditPriceText(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Foto por link</Label>
                    <Input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Foto da galeria/computador</Label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadServiceImage(file, "edit");
                        e.currentTarget.value = "";
                      }}
                      className="h-11 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                    />
                    <div className="text-xs text-zinc-500">
                      {uploadingEdit ? "Enviando imagem..." : "Use JPG, PNG ou WEBP ate 5MB."}
                    </div>
                  </div>
                  {editImageUrl ? (
                    <div className="md:col-span-2">
                      <div className="relative h-20 w-32 overflow-hidden rounded-lg border border-[var(--line)]">
                        <Image src={editImageUrl} alt="Preview do servico" fill unoptimized sizes="128px" className="object-cover" />
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row md:col-span-6">
                    <Button className="w-full sm:w-auto" onClick={() => saveEdit(s.id)}>Salvar alteracoes</Button>
                    <Button className="w-full sm:w-auto" variant="ghost" onClick={cancelEdit}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {s.imageUrl ? (
                      <div className="relative mb-2 h-16 w-28 overflow-hidden rounded-lg">
                        <Image src={s.imageUrl} alt={s.name} fill unoptimized sizes="112px" className="object-cover" />
                      </div>
                    ) : null}
                    <div className="font-heading text-base font-bold text-zinc-950">{s.name}</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      {s.duration} min + prep {s.prepMinutes ?? 0} min | {money(s.price)} | {s.category ?? "Sem categoria"} | {s.active ? "Ativo" : "Inativo"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button className="w-full sm:w-auto" variant="ghost" onClick={() => startEdit(s)}>Editar</Button>
                    <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setDeleteTarget(s)}>Apagar</Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-2xl">
            <div className="font-heading text-lg font-bold text-zinc-950">Confirmar exclusao</div>
            <p className="mt-2 text-sm text-zinc-600">
              Deseja apagar o servico <span className="font-semibold text-zinc-900">{deleteTarget.name}</span>?
              Se ele ja tiver historico, sera apenas inativado.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button className="w-full sm:w-auto" onClick={confirmDelete}>
                Confirmar exclusao
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
