import { PlanType } from "@prisma/client";

export const MASTER_APPROVAL_PASSWORD = process.env.MASTER_APPROVAL_PASSWORD ?? "Cleidson@10";

export const PLAN_CATALOG: Record<
  PlanType,
  { label: string; price: number; days: number; description: string }
> = {
  TRIAL: {
    label: "Teste 7 dias",
    price: 0,
    days: 7,
    description: "Plano gratuito de avaliacao por 7 dias.",
  },
  MONTHLY: {
    label: "Mensal",
    price: 20000,
    days: 30,
    description: "Acesso por 30 dias.",
  },
  QUARTERLY: {
    label: "3 meses",
    price: 50000,
    days: 90,
    description: "Acesso por 90 dias.",
  },
  YEARLY: {
    label: "Anual",
    price: 120000,
    days: 365,
    description: "Acesso por 365 dias.",
  },
};

export function isMasterPasswordValid(input: string) {
  return input === MASTER_APPROVAL_PASSWORD;
}

export function resolvePlan(planType: PlanType) {
  return PLAN_CATALOG[planType];
}

export function calcPlanWindow(planType: PlanType, now = new Date()) {
  const plan = resolvePlan(planType);
  const startsAt = now;
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + plan.days);
  return { startsAt, expiresAt, price: plan.price };
}

export function isPlanActive(expiresAt?: Date | null, now = new Date()) {
  if (!expiresAt) return false;
  return expiresAt.getTime() >= now.getTime();
}

