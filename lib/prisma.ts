import { PrismaClient } from "@prisma/client";

function isTransientDbError(error: unknown) {
  const message = String((error as { message?: string })?.message ?? "");
  return (
    message.includes("Error in PostgreSQL connection") ||
    message.includes("kind: Closed") ||
    message.includes("Can't reach database server") ||
    message.includes("Connection terminated unexpectedly")
  );
}

async function retryOnce<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 180));
    return operation();
  }
}

function createPrismaClient() {
  return new PrismaClient({
    log: ["error", "warn"],
  }).$extends({
    query: {
      $allModels: {
        $allOperations({ query, args }) {
          return retryOnce(() => query(args));
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;
const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (process.env.NODE_ENV !== "production") {
  prisma.$connect().catch((error) => {
    console.error("Prisma initial connect failed:", error);
  });
}
