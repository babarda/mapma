"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  Marker,
  Popup,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import "maplibre-gl/dist/maplibre-gl.css";

import type { Photo } from "@/lib/types";
import { getMapStyle, MOROCCO_FIT_BOUNDS } from "@/lib/mapStyle";

type PointProps = { photoId: string };
type Cluster =
  | Supercluster.PointFeature<PointProps>
  | Supercluster.ClusterFeature<Supercluster.AnyProps>;

interface Props {
  photos: Photo[];
  /** Called when the visitor asks to open a photo's full detail view. */
  onOpenDetail?: (photo: Photo) => void;
  /** Fly to + select this photo. Re-triggered whenever `focusNonce` changes. */
  focusPhoto?: Photo | null;
  focusNonce?: number;
}

// A small framed thumbnail used for a single photo on the map.
function PhotoThumb({ photo }: { photo: Photo }) {
  return (
    <div className="cursor-pointer transition-transform hover:scale-110">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbnailUrl}
        alt={photo.title}
        className="h-12 w-12 rounded-[3px] border-2 border-white object-cover shadow-frame"
      />
    </div>
  );
}

// A "stack of photos" thumbnail with a count badge to convey photo density.
function ClusterThumb({
  photo,
  count,
}: {
  photo: Photo | undefined;
  count: number;
}) {
  return (
    <div className="relative cursor-pointer transition-transform hover:scale-105">
      {/* stacked cards behind, to suggest "many photos here" */}
      <div className="absolute left-1.5 top-1.5 h-14 w-14 rounded-[3px] border-2 border-white bg-sepia-300 shadow-frame" />
      <div className="absolute left-0.5 top-0.5 h-14 w-14 rounded-[3px] border-2 border-white bg-sepia-200 shadow-frame" />
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.thumbnailUrl}
          alt=""
          className="relative h-14 w-14 rounded-[3px] border-2 border-white object-cover shadow-frame"
        />
      ) : (
        <div className="relative h-14 w-14 rounded-[3px] border-2 border-white bg-sepia-400 shadow-frame" />
      )}
      <span className="absolute -right-2 -top-2 min-w-[22px] rounded-full bg-sepia-800 px-1.5 py-0.5 text-center text-[11px] font-semibold text-parchment shadow">
        {count}
      </span>
    </div>
  );
}

export default function MoroccoMap({
  photos,
  onOpenDetail,
  focusPhoto,
  focusNonce,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);

  const byId = useMemo(() => {
    const m = new Map<string, Photo>();
    photos.forEach((p) => m.set(p.id, p));
    return m;
  }, [photos]);

  const index = useMemo(() => {
    const sc = new Supercluster<PointProps>({ radius: 60, maxZoom: 14 });
    sc.load(
      photos.map((p) => ({
        type: "Feature" as const,
        properties: { photoId: p.id },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
    );
    return sc;
  }, [photos]);

  const recompute = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    const bbox: [number, number, number, number] = [
      b.getWest(),
      b.getSouth(),
      b.getEast(),
      b.getNorth(),
    ];
    const zoom = Math.round(map.getZoom());
    setClusters(index.getClusters(bbox, zoom));
  }, [index]);

  // Recompute when data changes (after the map is ready).
  useEffect(() => {
    recompute();
  }, [recompute]);

  const expandCluster = useCallback(
    (clusterId: number, lng: number, lat: number) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const zoom = Math.min(index.getClusterExpansionZoom(clusterId), 16);
      map.easeTo({ center: [lng, lat], zoom, duration: 500 });
    },
    [index],
  );

  // Open a photo's popup and pan so the point sits in the lower-middle of the
  // frame, leaving room above for the popup (which opens upward). Without this,
  // a marker near the top edge opens a popup that's clipped by the map frame.
  const openPhoto = useCallback((photo: Photo) => {
    setSelected(photo);
    const map = mapRef.current?.getMap();
    if (!map) return;
    const point = map.project([photo.lng, photo.lat]);
    point.y -= map.getContainer().clientHeight * 0.22;
    const center = map.unproject(point);
    map.easeTo({ center, duration: 400 });
  }, []);

  // Fly to a photo requested from outside (gallery / detail "Show on map").
  // Zooms in enough to break it out of any cluster, then opens its popup.
  useEffect(() => {
    if (!focusPhoto) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    setSelected(focusPhoto);
    map.easeTo({
      center: [focusPhoto.lng, focusPhoto.lat],
      zoom: Math.max(map.getZoom(), 13),
      duration: 700,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{
        bounds: MOROCCO_FIT_BOUNDS,
        fitBoundsOptions: { padding: 24 },
      }}
      mapStyle={getMapStyle()}
      minZoom={3}
      maxZoom={17}
      onLoad={recompute}
      onMove={recompute}
      onClick={() => setSelected(null)}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates as [number, number];

        if ("cluster" in c.properties && c.properties.cluster) {
          const clusterId = c.id as number;
          const count = c.properties.point_count as number;
          const leaf = index.getLeaves(clusterId, 1)[0];
          const photo = leaf ? byId.get(leaf.properties.photoId) : undefined;
          return (
            <Marker
              key={`cluster-${clusterId}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                expandCluster(clusterId, lng, lat);
              }}
            >
              <ClusterThumb photo={photo} count={count} />
            </Marker>
          );
        }

        const photo = byId.get((c.properties as PointProps).photoId);
        if (!photo) return null;
        return (
          <Marker
            key={photo.id}
            longitude={lng}
            latitude={lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              openPhoto(photo);
            }}
          >
            <PhotoThumb photo={photo} />
          </Marker>
        );
      })}

      {selected && (
        <Popup
          longitude={selected.lng}
          latitude={selected.lat}
          offset={20}
          maxWidth="280px"
          onClose={() => setSelected(null)}
          closeOnClick={false}
        >
          <article className="w-[260px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.thumbnailUrl}
              alt={selected.title}
              className="h-40 w-full object-cover"
            />
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-sepia-600">
                <span>
                  {selected.year != null
                    ? `${selected.yearApproximate ? "circa " : ""}${selected.year}`
                    : "Year unknown"}
                </span>
                <span aria-hidden>•</span>
                <span>{selected.city}</span>
              </div>
              <h3 className="mt-1 font-display text-base leading-snug text-ink">
                {selected.title}
              </h3>
              {selected.description && (
                <p className="mt-1 line-clamp-3 text-sm text-ink/70">
                  {selected.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {selected.categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-sepia-100 px-2 py-0.5 text-[11px] text-sepia-700"
                  >
                    {cat}
                  </span>
                ))}
              </div>
              {selected.source && (
                <p className="mt-2 text-[11px] italic text-ink/50">
                  Source: {selected.source}
                </p>
              )}
              {onOpenDetail && (
                <button
                  onClick={() => onOpenDetail(selected)}
                  className="mt-3 w-full rounded-full bg-sepia-700 px-3 py-1.5 text-xs font-medium text-parchment transition hover:bg-sepia-800"
                >
                  View details &amp; comments
                </button>
              )}
            </div>
          </article>
        </Popup>
      )}
    </MapGL>
  );
}
