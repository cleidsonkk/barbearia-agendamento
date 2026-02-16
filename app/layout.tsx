import "./globals.css";
import type { Metadata } from "next";
import type { Viewport } from "next";
import { Manrope, Sora } from "next/font/google";

const heading = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["600", "700", "800"],
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Barbearia | Agendamento",
  description: "Agendamento online moderno, rapido e profissional.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${heading.variable} ${body.variable} font-body`}>{children}</body>
    </html>
  );
}
