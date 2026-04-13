import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Syne } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TANA-TAN — AI Yield Optimizer",
  description:
    "TANA finds the yield. TAN executes it. AI-powered cross-chain yield optimizer built on LI.FI Earn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${syne.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#FAF6EE] text-[#1A1A1A]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
