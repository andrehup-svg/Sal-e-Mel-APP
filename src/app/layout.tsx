import type { Metadata } from "next";
import { DM_Serif_Display, Nunito, DM_Mono } from "next/font/google";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-src",
});

const nunito = Nunito({
  weight: ["400", "600", "800"],
  subsets: ["latin"],
  variable: "--font-ui-src",
});

const dmMono = DM_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-mono-ds-src",
});

export const metadata: Metadata = {
  title: "Sal e Mel",
  description: "Gestão da confeitaria Sal e Mel",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${dmSerifDisplay.variable} ${nunito.variable} ${dmMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-creme text-tinta font-ui antialiased">
        {children}
      </body>
    </html>
  );
}
