// Resolves which MapLibre style to use.
//
// We always load the style through our own `/api/map-style` route. That route
// proxies MapTiler (or OpenFreeMap when no key) and strips the disputed-border
// layer, so Morocco and Western Sahara render as one uninterrupted territory.

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export function getMapStyle(): string {
  return "/api/map-style";
}

export const usingMapTiler = Boolean(MAPTILER_KEY);

// Tight bounds used to FIT the whole country into view on first load,
// so the complete map of Morocco is visible before the user zooms in.
// [ [west, south], [east, north] ]
export const MOROCCO_FIT_BOUNDS: [[number, number], [number, number]] = [
  [-13.4, 27.6],
  [-0.9, 36.0],
];

// Loose bounds so panning stays around Morocco (incl. Atlantic + south).
export const MOROCCO_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-18.0, 20.0],
  [0.5, 36.8],
];
