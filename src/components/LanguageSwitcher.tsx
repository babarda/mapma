"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Globe } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, LOCALE_LABELS, type Locale } from "@/i18n/routing";

// Switches the active language while keeping the visitor on the same page.
// next-intl's router rewrites the locale prefix and the choice is remembered
// via the NEXT_LOCALE cookie the middleware sets.
export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next as Locale });
    });
  }

  return (
    <label className="inline-flex items-center gap-1 text-sepia-700">
      <Globe className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        className="cursor-pointer rounded-full border border-sepia-200 bg-white/60 px-2 py-1 text-xs text-sepia-800 outline-none hover:bg-sepia-100 disabled:opacity-50"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
