"use client";

import { Briefcase, ClipboardList, Flame, MessageCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Rol } from "@/lib/tipos";

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

export function BarraNavegacion({ rol }: { rol: Rol }) {
  const path = usePathname();
  return (
    <nav className="pb-seguro border-t border-zinc-200 bg-white">
      <ul className="flex">
        {ENLACES[rol].map(({ href, etiqueta, icono: Icono }) => {
          const activo = path === href || path.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-medium ${activo ? "text-rose-600" : "text-zinc-500"}`}
              >
                <Icono className="size-6" strokeWidth={activo ? 2.5 : 2} />
                {etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
