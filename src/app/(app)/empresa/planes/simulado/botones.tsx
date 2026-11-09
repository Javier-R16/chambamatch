"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BotonesSimulado({ pagoId }: { pagoId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function confirmar(aprobar: boolean) {
    setEnviando(true);
    const r = await fetch("/api/pagos/simulado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagoId, aprobar }),
    });
    if (!r.ok) {
      setEnviando(false);
      return void toast.error("No se pudo procesar");
    }
    router.replace(`/empresa/planes?pago=${aprobar ? "ok" : "cancelado"}`);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" disabled={enviando} onClick={() => confirmar(false)}>
        Rechazar
      </Button>
      <Button className="flex-1 font-bold" disabled={enviando} onClick={() => confirmar(true)}>
        Aprobar pago
      </Button>
    </div>
  );
}
