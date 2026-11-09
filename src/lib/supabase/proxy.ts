import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/pagos/webhook: lo llama la pasarela de pago (sin sesión); valida su propia firma.
const RUTAS_PUBLICAS = ["/", "/entrar", "/auth", "/privacidad", "/api/pagos/webhook"];

function esPublica(path: string) {
  return RUTAS_PUBLICAS.some((r) => (r === "/" ? path === "/" : path === r || path.startsWith(r + "/")));
}

// Refresca la sesión en cada petición y hace redirecciones básicas.
// La autorización real la hace RLS en la base de datos.
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const conSesion = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  const redirigir = (destino: string) => {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!conSesion && !esPublica(path)) return redirigir("/entrar");
  if (conSesion && (path === "/" || path === "/entrar")) return redirigir("/inicio");

  return response;
}
