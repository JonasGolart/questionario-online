import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Questionário Online",
  description: "Plataforma de questionários da StackFAB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${outfit.variable}`}>
      <body style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>{children}</body>
    </html>
  );
}
