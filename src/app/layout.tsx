import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://flowboard-blagone.vercel.app"),
  title: "Flowboard — спокойное управление задачами",
  description:
    "Интерактивное рабочее пространство для личных задач, проектов и спокойного прогресса.",
  alternates: { canonical: "/" },
  openGraph: { title: "Flowboard — спокойное управление задачами", description: "Задачи, сроки, архив и аналитика в одном спокойном пространстве.", url: "/", siteName: "Flowboard", locale: "ru_RU", type: "website" },
  twitter: { card: "summary", title: "Flowboard", description: "Личный трекер задач без визуального шума." },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}<Analytics /></body>
    </html>
  );
}
