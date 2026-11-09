import "server-only";

// Cliente mínimo de la API de Gemini (capa gratis) con salida JSON estructurada.
const MODELO = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

export class ErrorGemini extends Error {
  constructor(
    message: string,
    public estado: number,
  ) {
    super(message);
  }
}

export async function generarJSON<T>(instrucciones: string, prompt: string, esquema: object): Promise<T> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) throw new ErrorGemini("Falta GEMINI_API_KEY", 500);

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instrucciones }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: esquema, temperature: 0.6 },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!r.ok) {
    const detalle = await r.text().catch(() => "");
    console.error("Gemini", r.status, detalle.slice(0, 500));
    throw new ErrorGemini(r.status === 429 ? "Límite diario de la IA alcanzado" : "La IA no respondió", r.status);
  }
  const datos = await r.json();
  const texto: string | undefined = datos?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new ErrorGemini("Respuesta vacía de la IA", 502);
  return JSON.parse(texto) as T;
}
