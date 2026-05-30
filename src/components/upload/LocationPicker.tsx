"use client";

import MapGL, {
  Marker,
  NavigationControl,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import { MapPin } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

import { getMapStyle, MOROCCO_FIT_BOUNDS } from "@/lib/mapStyle";

interface Props {
  lng: number | null;
  lat: number | null;
  onChange: (lng: number, lat: number) => void;
}

// Click or drag the pin to set the photo's location.
export default function LocationPicker({ lng, lat, onChange }: Props) {
  const hasPoint = lng != null && lat != null;

  function onMapClick(e: MapLayerMouseEvent) {
    onChange(e.lngLat.lng, e.lngLat.lat);
  }

  return (
    <div className="h-56 w-full overflow-hidden rounded-lg border border-sepia-200">
      <MapGL
        initialViewState={
          hasPoint
            ? { longitude: lng, latitude: lat, zoom: 11 }
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
  );
}
