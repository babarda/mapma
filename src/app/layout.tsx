import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const DESCRIPTION =
  "A digital archive of Morocco's collective memory. Upload historical photos and explore the country through time on an interactive map.";

export const metadata: Metadata = {
  metadataBase: new URL("https://mapma.org"),
  title: {
    default: "MAPMA — Morocco's Photographic Memory",
    template: "%s — MAPMA",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "MAPMA",
    url: "https://mapma.org",
    title: "MAPMA — Morocco's Photographic Memory",
    description: DESCRIPTION,
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: "MAPMA — Morocco's Photographic Memory",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
