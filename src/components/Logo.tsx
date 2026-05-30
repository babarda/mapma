import { cn } from "@/lib/utils";

interface LogoProps {
  /** Font size (px) of the wordmark. */
  size?: number;
  /** Show the "Morocco's photographic memory" tagline beneath. */
  tagline?: boolean;
  className?: string;
}

// MAPMA wordmark — "MAP" bold + "MA" regular, set in the display serif to read
// like a heritage/academic institute mark. The "M" emblem lives only in the
// browser-tab favicon (src/app/icon.svg), not in the page UI.
export default function Logo({ size = 30, tagline = false, className }: LogoProps) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span
        className="font-display tracking-[0.04em] text-ink"
        style={{ fontSize: size }}
      >
        <span className="font-bold">MAP</span>
        <span className="font-normal text-sepia-700">MA</span>
      </span>
      {tagline && (
        <span className="mt-1 text-[0.6rem] uppercase tracking-[0.22em] text-sepia-600">
          Morocco&apos;s Photographic Memory
        </span>
      )}
    </span>
  );
}
