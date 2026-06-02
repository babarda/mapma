import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-sepia-700 hover:text-sepia-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>

      <Logo size={34} />

      <h1 className="mt-8 font-display text-4xl leading-tight text-ink">
        About Mapma
      </h1>
      <p className="mt-2 text-base text-sepia-700">
        Preserving Morocco&apos;s Photographic Memory
      </p>

      <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink/75">
        <p>
          Mapma is a collaborative digital heritage platform dedicated to
          preserving, documenting, and geolocating historical photographs of
          Morocco.
        </p>
        <p>
          The project was initiated by Badr Abardazzou and Hubert Zalmata after
          observing a growing problem: thousands of valuable historical
          photographs were being shared across social media platforms,
          particularly Facebook groups, without consistent documentation, source
          attribution, geographic references, or historical context.
        </p>
        <p>
          As photographs are reposted from one page to another, titles are often
          modified, descriptions are shortened or altered, locations become
          uncertain, and original sources are frequently lost. Over time, this
          process gradually disconnects photographs from their historical value
          and authenticity.
        </p>
        <p>
          We realized that social media, while excellent for discovery and
          discussion, was not designed to serve as a long-term historical
          archive. Mapma was created to address this challenge.
        </p>
      </div>

      <Section title="A Collaborative Heritage Archive">
        <p>
          Mapma is built as a community-driven archive where anyone can
          contribute historical photographs and help preserve Morocco&apos;s
          collective memory. Contributors can upload photographs and provide
          available metadata, including title, location, date or historical
          period, description, source or archive reference, photographer (when
          known), and historical context.
        </p>
        <p>
          Each photograph becomes more valuable when accompanied by accurate
          information and verifiable sources.
        </p>
      </Section>

      <Section title="AI-Assisted Historical Documentation">
        <p>
          To assist contributors, Mapma includes an AI Historian Guide. When
          information about a photograph is incomplete or uncertain, the AI
          assistant can suggest possible locations, estimate historical periods,
          identify architectural, cultural, or geographical clues, recommend
          descriptive metadata, detect potential inconsistencies, and help
          contributors formulate accurate historical descriptions.
        </p>
        <p>
          The AI does not replace human expertise. Instead, it serves as a
          research assistant designed to support contributors and encourage
          better documentation practices. All AI-generated suggestions remain
          subject to human verification.
        </p>
      </Section>

      <Section title="Multi-Layer Verification">
        <p>
          Mapma is designed around the principle that historical preservation
          requires both openness and quality control. The validation process
          operates through multiple layers:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="font-medium text-ink">Community Contribution</strong> —
            anyone may submit photographs and associated information.
          </li>
          <li>
            <strong className="font-medium text-ink">Contributor Review</strong> —
            contributors can revise and improve metadata after submission as new
            information becomes available.
          </li>
          <li>
            <strong className="font-medium text-ink">AI-Assisted Validation</strong> —
            the AI Historian Guide performs preliminary analysis and suggests
            improvements or corrections.
          </li>
          <li>
            <strong className="font-medium text-ink">Volunteer Curatorial Review</strong> —
            a network of volunteer administrators, researchers, historians,
            photographers, and heritage enthusiasts reviews submitted content in
            batches to validate information, improve descriptions, and ensure
            consistency across the archive.
          </li>
        </ul>
        <p>
          This collaborative workflow aims to maximize both participation and
          historical reliability.
        </p>
      </Section>

      <Section title="Geolocating History">
        <p>
          One of Mapma&apos;s core objectives is the precise geolocation of
          historical photographs. Whenever possible, photographs are linked to
          their exact or approximate geographic coordinates and displayed on an
          interactive map.
        </p>
        <p>
          This allows visitors to explore historical photographs geographically,
          discover how places have evolved through time, compare past and present
          landscapes, and understand local history within its geographical
          context. The map becomes not only an archive but also a visual
          historical atlas of Morocco.
        </p>
      </Section>

      <Section title="For Future Generations">
        <p>
          Historical photographs are more than images. They are documents,
          testimonies, memories, and evidence of cultural, architectural, social,
          and human history.
        </p>
        <p>
          Mapma seeks to create a sustainable and academically valuable archive
          that can be used by historians, researchers, students, museums,
          cultural institutions, documentary filmmakers, local communities, and
          future generations. Our mission is simple: to ensure that
          Morocco&apos;s photographic heritage is preserved with the greatest
          possible accuracy, enriched through collective knowledge, and made
          accessible to everyone.
        </p>
      </Section>

      <Section title="Founding Vision">
        <p>Mapma was born from a simple observation:</p>
        <p className="border-l-2 border-sepia-300 pl-4 italic text-ink/70">
          We are surrounded by extraordinary historical photographs, yet we risk
          losing their stories.
        </p>
        <p>
          By combining community collaboration, historical expertise, geospatial
          technology, and artificial intelligence, Mapma aims to transform
          scattered photographs into a structured, searchable, and enduring
          digital memory of Morocco.
        </p>
      </Section>

      <p className="mt-12 border-t border-sepia-200 pt-6 text-center text-[0.65rem] tracking-wide text-ink/40">
        babardazzou
      </p>
    </main>
  );
}
