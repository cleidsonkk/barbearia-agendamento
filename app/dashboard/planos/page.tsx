import { requireBarber } from "@/lib/guards";
import PlanosClient from "./ui";

export default async function PlanosPage() {
  await requireBarber({ skipPlanCheck: true });
  return <PlanosClient />;
}

