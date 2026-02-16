import bcrypt from "bcryptjs";
import { PlanType, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

function toSlugBase(input: string) {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "barbearia";
}

function randomSuffix(size = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < size; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  const email = process.env.SEED_BARBER_EMAIL || "admin@barbearia.com";
  const pass = process.env.SEED_BARBER_PASSWORD || "123456";
  const shopName = process.env.SEED_SHOP_NAME || "Barbearia Premium";
  const phone = process.env.SEED_BARBER_PHONE || "82999999999";

  const hashed = await bcrypt.hash(pass, 10);
  const planStartsAt = new Date();
  const planExpiresAt = new Date();
  planExpiresAt.setDate(planExpiresAt.getDate() + 7);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: Role.BARBER },
    create: { email, password: hashed, role: Role.BARBER },
  });

  const slugBase = toSlugBase(shopName);
  const publicSlug = `${slugBase}-${randomSuffix(6)}`;

  const barber = await prisma.barberProfile.upsert({
    where: { userId: user.id },
    update: { shopName, phone, planType: PlanType.TRIAL, planPrice: 0, planStartsAt, planExpiresAt },
    create: {
      userId: user.id,
      publicSlug,
      shopName,
      phone,
      planType: PlanType.TRIAL,
      planPrice: 0,
      planStartsAt,
      planExpiresAt,
      schedule: {
        create: {
          workDays: "1,2,3,4,5,6",
          startTime: "08:00",
          endTime: "20:00",
          slotMinutes: 20,
        },
      },
      services: {
        create: [
          { name: "Corte (40min)", duration: 40, price: 3500, sortOrder: 1 },
          { name: "Corte + Barba (60min)", duration: 60, price: 5500, sortOrder: 2 },
          { name: "Sobrancelha (20min)", duration: 20, price: 1500, sortOrder: 3 },
          { name: "Luzes (120min)", duration: 120, price: 15000, sortOrder: 4 },
        ],
      },
    },
  });

  console.log("Seed OK:", { barberEmail: email, barberPassword: pass, shopName: barber.shopName, publicSlug: barber.publicSlug });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
