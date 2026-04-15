type MapStatusBadgeProps = {
  geocodingCount: number;
  homeGeocodeStatus: "idle" | "loading" | "error";
  resolvedMarkerCount: number;
};

export function MapStatusBadge({
  geocodingCount,
  homeGeocodeStatus,
  resolvedMarkerCount
}: MapStatusBadgeProps) {
  const message =
    homeGeocodeStatus === "loading"
      ? "Locating home address..."
      : homeGeocodeStatus === "error"
        ? "Could not locate that home address. Showing SF map context."
        : `Showing ${resolvedMarkerCount} school markers`;

  return (
    <div className="absolute bottom-6 left-6 max-w-xs rounded-xl bg-white/95 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur">
      {message}
      {geocodingCount > 0 ? ` · loading ${geocodingCount}` : ""}
    </div>
  );
}
