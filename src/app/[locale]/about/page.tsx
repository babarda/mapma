import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "About — MAPMA",
  description:
    "Mapma is a collaborative digital heritage platform dedicated to preserving, documenting, and geolocating historical photographs of Morocco.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/75">{children}</div>
    </section>
  );
}

export default function AboutPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = useTranslations("About");
  const tc = useTranslations("Common");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-sepia-700 hover:text-sepia-900"
      >
        <ArrowLeft className="h-4 w-4" /> {tc("backToMap")}
      </Link>

      <Logo size={34} />

      <h1 className="mt-8 font-display text-4xl leading-tight text-ink">{t("title")}</h1>
      <p className="mt-2 text-base text-sepia-700">{t("subtitle")}</p>

      <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink/75">
        <p>{t("intro1")}</p>
        <p>{t("intro2")}</p>
        <p>{t("intro3")}</p>
        <p>{t("intro4")}</p>
      </div>

      <Section title={t("s1Title")}>
        <p>{t("s1p1")}</p>
        <p>{t("s1p2")}</p>
      </Section>

      <Section title={t("s2Title")}>
        <p>{t("s2p1")}</p>
        <p>{t("s2p2")}</p>
      </Section>

      <Section title={t("verifyTitle")}>
        <p>{t("verifyIntro")}</p>
        <ul className="list-disc space-y-1.5 ps-5">
          <li>
            <strong className="font-medium text-ink">{t("verifyTerm1")}</strong> —{" "}
            {t("verifyDesc1")}
          </li>
          <li>
            <strong className="font-medium text-ink">{t("verifyTerm2")}</strong> —{" "}
            {t("verifyDesc2")}
          </li>
          <li>
            <strong className="font-medium text-ink">{t("verifyTerm3")}</strong> —{" "}
            {t("verifyDesc3")}
          </li>
          <li>
            <strong className="font-medium text-ink">{t("verifyTerm4")}</strong> —{" "}
            {t("verifyDesc4")}
          </li>
        </ul>
        <p>{t("verifyOutro")}</p>
      </Section>

      <Section title={t("geoTitle")}>
        <p>{t("geoP1")}</p>
        <p>{t("geoP2")}</p>
      </Section>

      <Section title={t("futureTitle")}>
        <p>{t("futureP1")}</p>
        <p>{t("futureP2")}</p>
      </Section>

      <Section title={t("visionTitle")}>
        <p>{t("visionP1")}</p>
        <p className="border-s-2 border-sepia-300 ps-4 italic text-ink/70">
          {t("visionQuote")}
        </p>
        <p>{t("visionP2")}</p>
      </Section>

      <p className="mt-12 border-t border-sepia-200 pt-6 text-center text-[0.65rem] tracking-wide text-ink/40">
        babardazzou
      </p>
    </main>
  );
}
