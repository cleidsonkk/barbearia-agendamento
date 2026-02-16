"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui";

export default function TrocarContaButton() {
  return (
    <Button
      className="w-full"
      variant="ghost"
      onClick={() => signOut({ callbackUrl: "/login?callbackUrl=/agendar/reservar" })}
    >
      Trocar conta
    </Button>
  );
}
