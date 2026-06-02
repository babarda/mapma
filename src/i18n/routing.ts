import { defineRouting } from "next-intl/routing";

// MAPMA speaks English (default), French, and Arabic. The default locale is
// served without a prefix (mapma.org/), the others get one (/fr, /ar).
export const routing = defineRouting({
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};
