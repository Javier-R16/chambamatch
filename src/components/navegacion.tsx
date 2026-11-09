"use client";

import { Briefcase, ClipboardList, Flame, MessageCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { Mensaje, Rol } from "@/lib/tipos";

const ENLACES: Record<Rol, { href: string; etiqueta: string; icono: typeof Flame }[]> = {
  candidato: [
    { href: "/chambas", etiqueta: "Chambas", icono: Flame },
    { href: "/postulaciones", etiqueta: "Postulaciones", icono: ClipboardList },
    { href: "/matches", etiqueta: "Matches", icono: MessageCircle },
    { href: "/perfil", etiqueta: "Perfil", icono: UserRound },
  ],
  empresa: [
    { href: "/empresa", etiqueta: "Vacantes", icono: Briefcase },
    { href: "/matches", etiqueta: "Matches", icono: MessageCircle },
    { href: "/perfil", etiqueta: "Perfil", icono: UserRound },
  ],
};

export function BarraNavegacion({ rol, uid }: { rol: Rol; uid: string }) {
  const path = usePathname();
  const router = useRouter();
  const [noLeidos, setNoLeidos] = useState(0);

  // Mensajes sin leer + aviso en vivo de mensajes nuevos (RLS filtra solo mis chats)
  useEffect(() => {
    const supabase = crearClienteNavegador();
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", uid)
      .is("leido_en", null)
      .then(({ count }) => setNoLeidos(count ?? 0));

    const canal = supabase
      .channel(`avisos-${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        const m = p.new as Mensaje;
        if (m.sender_id === uid) return;
        setNoLeidos((n) => n + 1);
        navigator.vibrate?.(20);
        toast(m.cuerpo.length > 80 ? m.cuerpo.slice(0, 80) + "…" : m.cuerpo, {
          description: "Nuevo mensaje",
          action: { label: "Ver", onClick: () => router.push(`/chat/${m.match_id}`) },
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [uid, router]);

  return (
    <nav className="pb-seguro border-t border-zinc-200 bg-white">
      <ul className="flex">
        {ENLACES[rol].map(({ href, etiqueta, icono: Icono }) => {
          const activo = path === href || path.startsWith(href + "/");
          const badge = href === "/matches" && noLeidos > 0;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-medium ${activo ? "text-rose-600" : "text-zinc-500"}`}
              >
                <span className="relative">
                  <Icono className="size-6" strokeWidth={activo ? 2.5 : 2} />
                  {badge && (
                    <span className="absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">
                      {noLeidos > 9 ? "9+" : noLeidos}
                    </span>
                  )}
                </span>
                {etiqueta}
                {badge && <span className="sr-only">({noLeidos} sin leer)</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
