export function getHomeMarkerIcon(
  google: typeof window.google
): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 9,
    fillColor: "#111827",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 3
  };
}

export function getSchoolMarkerIcon(
  google: typeof window.google,
  isSelected: boolean
): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: isSelected ? 11 : 8,
    fillColor: isSelected ? "#1d4ed8" : "#2563eb",
    fillOpacity: 0.95,
    strokeColor: "#ffffff",
    strokeWeight: isSelected ? 4 : 3
  };
}
