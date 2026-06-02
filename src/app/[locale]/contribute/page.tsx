import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "How to Contribute — MAPMA",
  description:
    "Mapma is a collaborative project built by and for people who care about Morocco's historical and photographic heritage. Here's how to take part.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/75">{children}</div>
    </section>
  );
}

export default function ContributePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = useTranslations("Contribute");
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

      <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink/75">
        <p>{t("intro1")}</p>
      </div>

      <Section title={t("s1Title")}>
        <p>{t("s1Intro")}</p>
        <ul className="list-disc space-y-1.5 ps-5">
          <li>{t("s1Item1")}</li>
          <li>{t("s1Item2")}</li>
          <li>{t("s1Item3")}</li>
          <li>{t("s1Item4")}</li>
          <li>{t("s1Item5")}</li>
        </ul>
        <p>
          <Link href="/signup" className="text-sepia-700 underline hover:text-sepia-900">
            {t("s1CtaLink")}
          </Link>{" "}
          {t("s1CtaSuffix")}
        </p>
      </Section>

      <Section title={t("s2Title")}>
        <p>{t("s2p1")}</p>
        <p>{t("s2p2")}</p>
      </Section>

      <Section title={t("s3Title")}>
        <p>{t("s3p1")}</p>
        <p>{t("s3p2")}</p>
      </Section>

      <Section title={t("s4Title")}>
        <p>{t("s4p1")}</p>
        <p>{t("s4p2")}</p>
      </Section>

      <Section title={t("levelsTitle")}>
        <ul className="space-y-3">
          <li>
            <strong className="font-medium text-ink">{t("levelTerm1")}</strong> —{" "}
            {t("levelDesc1")}
          </li>
          <li>
            <strong className="font-medium text-ink">{t("levelTerm2")}</strong> —{" "}
            {t("levelDesc2")}
          </li>
          <li>
            <strong className="font-medium text-ink">{t("levelTerm3")}</strong> —{" "}
            {t("levelDesc3")}
          </li>
        </ul>
        <p>{t("levelsOutro")}</p>
      </Section>

      <Section title={t("joinTitle")}>
        <p>{t("joinP1")}</p>
        <p>{t("joinP2")}</p>
      </Section>

      <Section title={t("assocTitle")}>
        <p>{t("assocP1")}</p>
        <ul className="list-disc space-y-1.5 ps-5">
          <li>{t("assocItem1")}</li>
          <li>{t("assocItem2")}</li>
          <li>{t("assocItem3")}</li>
          <li>{t("assocItem4")}</li>
          <li>{t("assocItem5")}</li>
          <li>{t("assocItem6")}</li>
        </ul>
        <p>{t("assocOutro")}</p>
      </Section>

      <Section title={t("visionTitle")}>
        <p>{t("visionP1")}</p>
        <p>{t("visionP2")}</p>
      </Section>

      <p className="mt-12 border-t border-sepia-200 pt-6 text-center text-[0.65rem] tracking-wide text-ink/40">
        babardazzou
      </p>
    </main>
  );
}
