"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearClienteNavegador } from "@/lib/supabase/client";

const traducir = (msg: string) => {
  if (msg.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (msg.includes("Email not confirmed")) return "Confirma tu correo antes de entrar (revisa tu bandeja).";
  if (msg.includes("already registered")) return "Ese correo ya tiene cuenta. Entra con tu contraseña.";
  if (msg.includes("Password should be")) return "La contraseña debe tener al menos 8 caracteres.";
  return "Algo salió mal. Intenta de nuevo.";
};

export function FormEntrar() {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const params = useSearchParams();
  const [modo, setModo] = useState<"entrar" | "registro">("entrar");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [revisaCorreo, setRevisaCorreo] = useState(false);

  const error = params.get("error");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
      setEnviando(false);
      if (error) return void toast.error(traducir(error.message));
      router.replace("/inicio");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: clave,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      setEnviando(false);
      if (error) return void toast.error(traducir(error.message));
      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
      } else setRevisaCorreo(true);
    }
  }

  async function conGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) toast.error("Google no está disponible todavía.");
  }

  if (revisaCorreo) {
    return (
      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-3xl">📬</p>
        <p className="mt-2 text-lg font-semibold">Revisa tu correo</p>
        <p className="mt-1 text-zinc-600">
          Te enviamos un enlace a <b>{email}</b> para confirmar tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {error && (
        <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">No pudimos iniciar sesión. Intenta de nuevo.</p>
      )}
      <Button type="button" variant="outline" className="h-12 w-full gap-3 bg-white" onClick={conGoogle}>
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.9A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2.1a11 11 0 0 0 0 9.8L5.8 14z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1L5.8 10C6.7 7.3 9.1 5.4 12 5.4z" />
        </svg>
        Continuar con Google
      </Button>

      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" /> o con tu correo <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <form onSubmit={enviar} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clave">Contraseña</Label>
          <Input
            id="clave"
            type="password"
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            minLength={8}
            required
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className="bg-white"
          />
        </div>
        <Button type="submit" className="h-12 w-full text-base font-bold" disabled={enviando}>
          {enviando ? "Un momento…" : modo === "entrar" ? "Entrar" : "Crear cuenta"}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-600">
        {modo === "entrar" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
        <button
          type="button"
          className="font-semibold text-rose-600 underline-offset-2 hover:underline"
          onClick={() => setModo(modo === "entrar" ? "registro" : "entrar")}
        >
          {modo === "entrar" ? "Crear cuenta" : "Entrar"}
        </button>
      </p>
    </div>
  );
}
