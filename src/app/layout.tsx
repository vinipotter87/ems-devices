import type { Metadata, Viewport } from "next";
import "@fontsource-variable/sora";
import "./globals.css";

export const metadata: Metadata = {
  title: "Devices EMS | Inventário",
  description: "Inventário de devices da regional: onde está cada aparelho, com qual médico e clínica.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F2D44",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
