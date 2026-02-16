export function toSlugBase(input: string) {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "barbearia";
}

export function randomSuffix(size = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < size; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function buildBarberPublicPath(slug: string) {
  return `/b/${slug}`;
}

export function buildBarberReservePath(slug: string) {
  return `/b/${slug}/reservar`;
}

