"use client";

import { Ban, Flag, MoreVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Selector } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { crearClienteNavegador } from "@/lib/supabase/client";

const MOTIVOS = [
  { valor: "oferta_falsa", etiqueta: "Oferta falsa o estafa" },
  { valor: "acoso", etiqueta: "Acoso o lenguaje ofensivo" },
  { valor: "spam", etiqueta: "Spam o publicidad" },
  { valor: "contenido_inapropiado", etiqueta: "Contenido inapropiado" },
  { valor: "otro", etiqueta: "Otro" },
];

type Props = {
  uid: string;
  otroId: string;
  otroNombre: string;
  matchId: string;
  yoBloquee: boolean;
  onCambioBloqueo: (bloqueado: boolean) => void;
};

export function AccionesChat({ uid, otroId, otroNombre, matchId, yoBloquee, onCambioBloqueo }: Props) {
  const supabase = crearClienteNavegador();
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<"menu" | "reportar" | "bloquear">("menu");
  const [motivo, setMotivo] = useState("oferta_falsa");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function reportar() {
    setEnviando(true);
    const { error } = await supabase
      .from("reports")
      .insert({ reporter_id: uid, reported_id: otroId, match_id: matchId, motivo, detalle: detalle.trim() || null });
    setEnviando(false);
    if (error) return void toast.error("No se pudo enviar el reporte.");
    toast.success("Gracias. Revisaremos el reporte.");
    setAbierto(false);
  }

  async function alternarBloqueo() {
    setEnviando(true);
    const { error } = yoBloquee
      ? await supabase.from("blocks").delete().eq("blocker_id", uid).eq("blocked_id", otroId)
      : await supabase.from("blocks").insert({ blocker_id: uid, blocked_id: otroId });
    setEnviando(false);
    if (error && error.code !== "23505") return void toast.error("No se pudo completar.");
    onCambioBloqueo(!yoBloquee);
    toast.success(yoBloquee ? `Desbloqueaste a ${otroNombre}` : `Bloqueaste a ${otroNombre}`);
    setAbierto(false);
  }

  return (
    <Sheet
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o);
        if (o) setVista("menu");
      }}
    >
      <SheetTrigger
        render={<button type="button" aria-label="Más opciones" className="ml-auto grid size-10 shrink-0 place-items-center rounded-full hover:bg-zinc-100" />}
      >
        <MoreVertical className="size-5" />
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl bg-zinc-50 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {vista === "menu" && (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">{otroNombre}</SheetTitle>
              <SheetDescription>Tu seguridad es primero. Nadie se entera de que reportaste.</SheetDescription>
            </SheetHeader>
            <div className="space-y-2 px-4 pb-2">
              <Button variant="outline" className="w-full justify-start gap-3 bg-white" onClick={() => setVista("reportar")}>
                <Flag className="size-4" /> Reportar
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 bg-white text-rose-600" onClick={() => setVista("bloquear")}>
                <Ban className="size-4" /> {yoBloquee ? "Desbloquear" : "Bloquear"}
              </Button>
            </div>
          </>
        )}

        {vista === "reportar" && (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Reportar a {otroNombre}</SheetTitle>
              <SheetDescription>Cuéntanos qué pasó. El reporte es confidencial.</SheetDescription>
            </SheetHeader>
            <div className="space-y-3 px-4 pb-2">
              <Selector id="motivo" valor={motivo} onCambio={setMotivo} opciones={MOTIVOS} />
              <Textarea
                rows={3}
                maxLength={1000}
                placeholder="Detalles (opcional)"
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                className="bg-white"
              />
              <Button className="w-full font-bold" disabled={enviando} onClick={reportar}>
                Enviar reporte
              </Button>
            </div>
          </>
        )}

        {vista === "bloquear" && (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">
                {yoBloquee ? `¿Desbloquear a ${otroNombre}?` : `¿Bloquear a ${otroNombre}?`}
              </SheetTitle>
              <SheetDescription>
                {yoBloquee
                  ? "Podrán volver a escribirse en este chat."
                  : "Ninguno de los dos podrá enviar mensajes y no volverán a verse en los feeds. No le avisaremos."}
              </SheetDescription>
            </SheetHeader>
            <div className="flex gap-2 px-4 pb-2">
              <Button variant="outline" className="flex-1" onClick={() => setVista("menu")}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1 font-bold" disabled={enviando} onClick={alternarBloqueo}>
                {yoBloquee ? "Desbloquear" : "Bloquear"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
