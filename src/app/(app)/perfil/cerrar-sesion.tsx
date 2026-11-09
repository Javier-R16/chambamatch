"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { crearClienteNavegador } from "@/lib/supabase/client";

export function CerrarSesion() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={async () => {
        await crearClienteNavegador().auth.signOut();
        router.replace("/entrar");
        router.refresh();
      }}
    >
      Cerrar sesión
    </Button>
  );
}
