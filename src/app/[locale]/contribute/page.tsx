import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

export default function ContributePage() {
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
        How to Contribute
      </h1>

      <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink/75">
        <p>
          Mapma is a collaborative project built by and for people who care about
          Morocco&apos;s historical and photographic heritage. Whether you are a
          historian, researcher, collector, photographer, archivist, or simply
          someone who owns old family photographs, your contribution can help
          preserve a piece of our collective memory.
        </p>
      </div>

      <Section title="1. Create an Account">
        <p>Creating a contributor account allows you to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Upload historical photographs</li>
          <li>Edit your submissions</li>
          <li>Participate in discussions</li>
          <li>Receive feedback from the community</li>
          <li>Track the status of your contributions</li>
        </ul>
        <p>
          <Link href="/signup" className="text-sepia-700 underline hover:text-sepia-900">
            Create an account
          </Link>{" "}
          to get started.
        </p>
      </Section>

      <Section title="2. Upload Historical Photographs">
        <p>
          Contributors are encouraged to provide as much information as possible,
          including title, location, approximate date or period, description,
          source or archive reference, photographer (if known), and additional
          historical context.
        </p>
        <p>Even if some information is unknown, photographs can still be submitted.</p>
      </Section>

      <Section title="3. AI-Assisted Documentation">
        <p>
          When information is incomplete, the Mapma AI Historian Guide can assist
          by suggesting possible locations, estimating historical periods,
          identifying architectural or cultural clues, recommending descriptions
          and metadata, and highlighting potential inconsistencies.
        </p>
        <p>All suggestions remain subject to human review and verification.</p>
      </Section>

      <Section title="4. Community Verification">
        <p>
          After submission, photographs enter a collaborative review process.
          Contributors may update information, while experienced volunteers and
          administrators review submissions to improve accuracy, consistency, and
          source attribution.
        </p>
        <p>
          The objective is not simply to collect photographs but to build a
          reliable historical archive.
        </p>
      </Section>

      <Section title="Contributor Levels">
        <ul className="space-y-3">
          <li>
            <strong className="font-medium text-ink">Contributor</strong> — any
            registered user can become a contributor by uploading photographs or
            helping improve existing records. Contributors form the foundation of
            the project and are encouraged to participate actively in documenting
            and preserving historical material.
          </li>
          <li>
            <strong className="font-medium text-ink">Trusted Contributor</strong> —
            contributors who consistently provide high-quality submissions and
            demonstrate a commitment to historical accuracy may be invited to
            become Trusted Contributors, receiving additional moderation and
            review privileges.
          </li>
          <li>
            <strong className="font-medium text-ink">Volunteer Curator / Administrator</strong> —
            selected from active members of the community based on historical
            knowledge, quality of contributions, commitment to the project,
            respect for archival standards, and constructive participation. Their
            role includes reviewing submissions, validating metadata, resolving
            conflicting information, maintaining archival consistency, and
            supporting contributors.
          </li>
        </ul>
        <p>
          Mapma seeks to build a diverse team of historians, researchers,
          photographers, local experts, and heritage enthusiasts from across
          Morocco and beyond.
        </p>
      </Section>

      <Section title="Join the Project">
        <p>
          Mapma is more than a website. It is an ongoing collaborative initiative
          dedicated to safeguarding Morocco&apos;s photographic heritage. We
          welcome historians, researchers, archivists, librarians, photographers,
          collectors, students, local history enthusiasts, and cultural heritage
          professionals.
        </p>
        <p>
          If you believe that historical photographs deserve to be preserved,
          documented, and shared responsibly, we invite you to participate.
        </p>
      </Section>

      <Section title="Towards a Heritage Association">
        <p>
          The founders are currently exploring the creation of an independent
          non-profit association dedicated to the preservation, documentation,
          and promotion of Morocco&apos;s photographic and visual heritage. The
          future association aims to:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Support the long-term sustainability of the archive</li>
          <li>Promote heritage preservation initiatives</li>
          <li>Organize collaborative research projects</li>
          <li>Develop educational resources</li>
          <li>Partner with archives, museums, universities, and cultural institutions</li>
          <li>Encourage citizen participation in documenting local history</li>
        </ul>
        <p>
          Individuals interested in contributing to this initiative, volunteering
          their expertise, or supporting the future association are encouraged to
          contact the project team.
        </p>
      </Section>

      <Section title="Our Vision">
        <p>
          We believe that preserving historical photographs is not only about
          protecting images. It is about preserving stories, places, identities,
          traditions, memories, and the countless human experiences that have
          shaped Morocco through time.
        </p>
        <p>
          Together, we can build a living archive that connects the past with
          future generations.
        </p>
      </Section>

      <p className="mt-12 border-t border-sepia-200 pt-6 text-center text-[0.65rem] tracking-wide text-ink/40">
        babardazzou
      </p>
    </main>
  );
}
