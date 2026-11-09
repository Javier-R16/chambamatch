import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "ChambaMatch", template: "%s · ChambaMatch" },
  description: "Desliza, haz match y consigue chamba en Panamá.",
  applicationName: "ChambaMatch",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2542d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-PA" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-zinc-50 text-zinc-900">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
