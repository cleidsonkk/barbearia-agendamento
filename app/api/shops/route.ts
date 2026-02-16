import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPlanActive } from "@/lib/plans";

export async function GET() {
  const all = await prisma.barberProfile.findMany({
    orderBy: { shopName: "asc" },
    select: {
      id: true,
      shopName: true,
      phone: true,
      address: true,
      instagram: true,
      planExpiresAt: true,
    },
  });
  const shops = all.filter((s) => isPlanActive(s.planExpiresAt)).map(({ planExpiresAt, ...rest }) => rest);
  return NextResponse.json({ shops });
}
