import type { MapStatus } from "@/types/map";

const overlayCopy: Record<MapStatus, { title: string; message: string }> = {
  idle: {
    title: "Loading map",
    message: "Preparing Google Maps and school markers."
  },
  loading: {
    title: "Loading map",
    message: "Preparing Google Maps and school markers."
  },
  ready: {
    title: "Map ready",
    message: "Google Maps is ready."
  },
  error: {
    title: "Map could not load",
    message:
      "Check the API key, enabled Google Maps JavaScript API, and billing settings."
  },
  "missing-key": {
    title: "Google Maps API key needed",
    message:
      "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local, then restart the dev server."
  }
};

type MapOverlayProps = {
  status: MapStatus;
};

export function MapOverlay({ status }: MapOverlayProps) {
  const copy = overlayCopy[status];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-soft">
        <div className="text-sm font-semibold uppercase tracking-wide text-accent">
          Map
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {copy.message}
        </p>
      </div>
    </div>
  );
}
