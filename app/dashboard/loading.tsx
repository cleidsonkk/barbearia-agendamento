import { DashboardShell } from "@/components/dashboard";
import { Card, CardBody, Skeleton } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <DashboardShell title="Carregando..." subtitle="Preparando o painel">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardBody>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-7 w-20" />
              <Skeleton className="mt-4 h-10 w-full" />
            </CardBody>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
