import type { Metadata } from "next";
import { Playfair_Display, Inter, Noto_Naskh_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import "../globals.css";
import { routing } from "@/i18n/routing";

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

// Arabic-capable face for RTL rendering (the Latin display/body fonts don't
// cover Arabic glyphs). Applied via CSS when dir="rtl" — see globals.css.
const arabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "MAPMA — Morocco's Photographic Memory",
    description: DESCRIPTION,
  },
};

// Pre-render all three locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();
  // Enable static rendering for this locale.
  setRequestLocale(locale);

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${display.variable} ${body.variable} ${arabic.variable}`}
    >
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
