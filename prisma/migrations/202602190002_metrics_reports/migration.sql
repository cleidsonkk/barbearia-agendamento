ALTER TABLE "BarberProfile"
ADD COLUMN IF NOT EXISTS "metricsResetAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MetricsReportType') THEN
    CREATE TYPE "MetricsReportType" AS ENUM ('MANUAL', 'WEEKLY_AUTO');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BarberMetricReport" (
  "id" TEXT NOT NULL,
  "barberId" TEXT NOT NULL,
  "type" "MetricsReportType" NOT NULL DEFAULT 'MANUAL',
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "totalBookings" INTEGER NOT NULL DEFAULT 0,
  "totalRevenue" INTEGER NOT NULL DEFAULT 0,
  "avgTicket" INTEGER NOT NULL DEFAULT 0,
  "topService" TEXT,
  "occupancy" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BarberMetricReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BarberMetricReport_barberId_createdAt_idx"
ON "BarberMetricReport"("barberId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'BarberMetricReport_barberId_fkey'
      AND table_name = 'BarberMetricReport'
  ) THEN
    ALTER TABLE "BarberMetricReport"
      ADD CONSTRAINT "BarberMetricReport_barberId_fkey"
      FOREIGN KEY ("barberId") REFERENCES "BarberProfile"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
