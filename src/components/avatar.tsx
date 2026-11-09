import { iniciales } from "@/lib/constantes";

type Props = { src?: string | null; nombre?: string | null; className?: string; cuadrado?: boolean };

// Foto o iniciales. <img> simple: las fotos vienen de Supabase Storage (público).
export function Avatar({ src, nombre, className = "size-12", cuadrado = false }: Props) {
  const forma = cuadrado ? "rounded-2xl" : "rounded-full";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${className} ${forma} shrink-0 object-cover`} draggable={false} />;
  }
  return (
    <div
      aria-hidden
      className={`${className} ${forma} grid shrink-0 place-items-center bg-gradient-to-br from-orange-400 to-rose-500 font-bold text-white`}
    >
      {iniciales(nombre)}
    </div>
  );
}
