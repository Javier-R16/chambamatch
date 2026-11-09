import { ImageResponse } from "next/og";

// Íconos PNG de la PWA generados en el build: /icons/96, /icons/192, /icons/512, /icons/maskable
const TAMANOS: Record<string, { lado: number; margen: number }> = {
  "96": { lado: 96, margen: 0 },
  "180": { lado: 180, margen: 0 },
  "192": { lado: 192, margen: 0 },
  "512": { lado: 512, margen: 0 },
  maskable: { lado: 512, margen: 0.1 }, // zona segura para íconos adaptativos de Android
};

export function generateStaticParams() {
  return Object.keys(TAMANOS).map((tam) => ({ tam }));
}

export async function GET(_: Request, { params }: RouteContext<"/icons/[tam]">) {
  const { tam } = await params;
  const t = TAMANOS[tam] ?? TAMANOS["192"];
  const fuente = t.lado * (t.margen ? 0.42 : 0.55);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f97316 0%, #f43f5e 55%, #c026d3 100%)",
          borderRadius: t.margen || tam === "96" ? 0 : t.lado * 0.22,
        }}
      >
        <div
          style={{
            width: t.lado * (t.margen ? 0.56 : 0.68),
            height: t.lado * (t.margen ? 0.56 : 0.68),
            borderRadius: "50%",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: fuente * 0.8,
          }}
        >
          🦐
        </div>
      </div>
    ),
    { width: t.lado, height: t.lado, emoji: "twemoji" },
  );
}
