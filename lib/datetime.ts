import { format } from "date-fns";

// Brasil (sem horario de verao atualmente).
const BR_OFFSET = "-03:00";
const BR_TIME_ZONE = "America/Sao_Paulo";

export function dateAtBrMidnight(dateISO: string) {
  return new Date(`${dateISO}T00:00:00${BR_OFFSET}`);
}

export function brTodayISO(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function brDateFromISO(dateISO: string) {
  const [year, month, day] = dateISO.split("-");
  if (!year || !month || !day) return dateISO;
  return `${day}/${month}/${year}`;
}

export function toBrDate(date: Date) {
  return format(date, "dd/MM/yyyy");
}

export function sameBrDate(a: Date, b: Date) {
  return format(a, "yyyy-MM-dd") === format(b, "yyyy-MM-dd");
}
