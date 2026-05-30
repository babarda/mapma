"use client";

interface Props {
  min: number;
  max: number;
  from: number;
  to: number;
  onChange: (range: { from: number; to: number }) => void;
}

// A lightweight dual-input year range. Kept intentionally simple for the
// foundation; a draggable two-thumb slider can replace this later.
export default function TimelineFilter({ min, max, from, to, onChange }: Props) {
  return (
    <div className="rounded-lg border border-sepia-200 bg-white/50 p-3">
      <div className="mb-1 flex items-center justify-between font-display text-sm text-ink">
        <span>Timeline</span>
        <span className="tabular-nums text-sepia-700">
          {from} – {to}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-xs text-ink/70">
          <span className="w-10">From</span>
          <input
            type="range"
            min={min}
            max={max}
            value={from}
            step={1}
            onChange={(e) => {
              const next = Math.min(Number(e.target.value), to);
              onChange({ from: next, to });
            }}
            className="w-full accent-sepia-600"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-ink/70">
          <span className="w-10">To</span>
          <input
            type="range"
            min={min}
            max={max}
            value={to}
            step={1}
            onChange={(e) => {
              const next = Math.max(Number(e.target.value), from);
              onChange({ from, to: next });
            }}
            className="w-full accent-sepia-600"
          />
        </label>
      </div>
    </div>
  );
}
