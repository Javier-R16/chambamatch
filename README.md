# ChambaMatch (nombre provisional)

App de empleo estilo Tinder para Panamá. El candidato desliza vacantes y la empresa desliza postulantes. Si los dos dicen que sí, hay match y se abre un chat en tiempo real.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui · motion (framer-motion) · Supabase (Auth, Postgres + RLS, Realtime, Storage) · Vercel.

## Puesta en marcha

1. **Variables de entorno**
   ```bash
   cp .env.example .env.local   # y completa los valores de Supabase → Project Settings → API
   ```
2. **Base de datos**: aplica las migraciones de `supabase/migrations/` en orden. Hay dos formas:
   - **CLI (recomendado):** `npx supabase login`, luego `npm run db:link` (elige tu proyecto) y `npm run db:push`.
   - **Manual:** pega cada archivo, en orden, en el SQL Editor del panel de Supabase.
3. **Auth en Supabase → Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (luego la URL de Vercel).
   - Redirect URLs: `http://localhost:3000/auth/callback` y `https://TU-APP.vercel.app/auth/callback`.
   - Para probar rápido, en Authentication → Providers → Email puedes desactivar "Confirm email".
4. **Datos de prueba** (opcional): `npm run sembrar`. Crea 6 empresas, 20 vacantes y 10 candidatos. Todas las cuentas usan la contraseña `ChambaDemo2026!`.
5. `npm run dev` y abre http://localhost:3000

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run test:rls` | Corre las migraciones en un Postgres embebido y prueba 45 reglas de seguridad (sin Docker) |
| `npm run sembrar` | Carga los datos de prueba (usa la service role key, solo en tu máquina) |
| `npm run db:push` | Aplica las migraciones al proyecto de Supabase vinculado |

## Seguridad (resumen)

- RLS activado en todas las tablas; `anon` no tiene acceso a nada.
- La empresa nunca ve los swipes a la izquierda, y solo ve a quien se postuló a SUS vacantes.
- Teléfono, correo (`contactos_privados`) y CV (bucket privado `cvs`) solo son visibles con match.
- El match lo crea un trigger (`crear_match`); el cliente no puede insertar en `matches`.
- Columnas sensibles (`rol`, `verificada`, `destacada_hasta`) bloqueadas con permisos por columna.
- La Súper Chamba (1 por día, hora de Panamá) se valida en la base de datos.

## Estructura

```
supabase/migrations/   SQL: esquema, funciones/feeds, RLS, storage
supabase/tests/        Pruebas de RLS con PGlite
scripts/sembrar.ts     Datos de prueba
src/app/               Pantallas (App Router)
src/components/swipe/  Mazo de tarjetas con arrastre (motion)
src/components/match/  Animación "¡Hay chamba!" y escucha de matches en vivo
src/lib/               Clientes de Supabase, sesión, tipos y constantes
```
