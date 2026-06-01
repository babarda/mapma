"use client";

import { useEffect, useRef, useState } from "react";
import MapGL, {
  Marker,
  NavigationControl,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import { Loader2, MapPin, Search, X } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

import { getMapStyle, MOROCCO_FIT_BOUNDS, usingMapTiler } from "@/lib/mapStyle";

interface Props {
  lng: number | null;
  lat: number | null;
  onChange: (lng: number, lat: number) => void;
}

interface GeoResult {
  name: string;
  lng: number;
  lat: number;
  bbox?: [number, number, number, number];
}

// Search a place to zoom the map, then click or drag the pin to set the exact
// location. Coordinates remain editable in the form for when they're known.
export default function LocationPicker({ lng, lat, onChange }: Props) {
  const mapRef = useRef<MapRef | null>(null);

  // Only treat the point as valid when both coords are finite numbers.
  // A NaN/Infinity (e.g. mid-typing "-" in the coordinate field) would make
  // MapLibre throw "Invalid LngLat" during render and crash the page.
  const hasPoint =
    lng != null && lat != null && Number.isFinite(lng) && Number.isFinite(lat);

  // ---- Place search (forward geocoding) ----
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  // Debounced lookup as the user types.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!active) return;
        setResults((data.results as GeoResult[]) ?? []);
        setOpen(true);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  function flyTo(r: GeoResult) {
    const map = mapRef.current?.getMap();
    if (map) {
      if (r.bbox) {
        map.fitBounds(
          [
            [r.bbox[0], r.bbox[1]],
            [r.bbox[2], r.bbox[3]],
          ],
          { padding: 40, duration: 800, maxZoom: 17 },
        );
      } else {
        map.flyTo({ center: [r.lng, r.lat], zoom: 16, duration: 800 });
      }
    }
    // Drop the pin at the result as a starting point; the user can fine-tune
    // it by dragging or clicking the exact spot.
    onChange(r.lng, r.lat);
    setQuery(r.name);
    setOpen(false);
  }

  function onMapClick(e: MapLayerMouseEvent) {
    onChange(e.lngLat.lng, e.lngLat.lat);
  }

  return (
    <div className="space-y-2">
      {/* Search bar */}
      {usingMapTiler && (
        <div className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-sepia-200 bg-white px-3 py-2">
            {searching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sepia-500" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-sepia-500" aria-hidden />
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (results[0]) flyTo(results[0]);
                }
              }}
              placeholder="Search a city, street or landmark to zoom the map…"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                aria-label="Clear search"
                className="shrink-0 text-ink/40 hover:text-ink/70"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {open && results.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-sepia-200 bg-white shadow-lg">
              {results.map((r, i) => (
                <li key={`${r.lng},${r.lat},${i}`}>
                  <button
                    type="button"
                    onClick={() => flyTo(r)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-sepia-50"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sepia-500" />
                    <span className="min-w-0">{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Map */}
      <div className="h-72 w-full overflow-hidden rounded-lg border border-sepia-200 sm:h-80">
        <MapGL
          ref={mapRef}
          initialViewState={
            hasPoint
              ? { longitude: lng, latitude: lat, zoom: 13 }
              : { bounds: MOROCCO_FIT_BOUNDS, fitBoundsOptions: { padding: 16 } }
          }
          mapStyle={getMapStyle()}
          minZoom={3}
          maxZoom={18}
          onClick={onMapClick}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          {hasPoint && (
            <Marker
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              draggable
              onDragEnd={(e) => onChange(e.lngLat.lng, e.lngLat.lat)}
            >
              <MapPin className="h-8 w-8 fill-sepia-500 text-sepia-800 drop-shadow" />
            </Marker>
          )}
        </MapGL>
      </div>

      <p className="text-xs text-ink/50">
        Search a place to zoom in, then click the map or drag the pin to set the
        exact spot.
      </p>
    </div>
  );
}
