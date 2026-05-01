import type { SchoolType } from "@/types/school";

export function getHomeMarkerIcon(
  google: typeof window.google
): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <rect x="2" y="2" width="40" height="40" rx="10" fill="#dc2626" stroke="#ffffff" stroke-width="4" />
      <text x="22" y="28" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">H</text>
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44, 44),
    anchor: new google.maps.Point(22, 22)
  };
}

export function getSchoolMarkerIcon(
  google: typeof window.google,
  {
    schoolType,
    isSelected,
    isWithinRadius
  }: {
    schoolType: SchoolType;
    isSelected: boolean;
    isWithinRadius: boolean;
  }
): google.maps.Symbol {
  const markerColorsByType: Record<
    SchoolType,
    { base: string; selected: string }
  > = {
    elementary: {
      base: "#059669",
      selected: "#047857"
    },
    middle: {
      base: "#d97706",
      selected: "#b45309"
    },
    high: {
      base: "#2563eb",
      selected: "#1d4ed8"
    },
    other: {
      base: "#64748b",
      selected: "#475569"
    }
  };

  const palette = markerColorsByType[schoolType];
  const fillColor = isSelected ? "#facc15" : palette.base;

  return {
    path: isSelected
      ? "M 0,-24 L 6.5,-8 L 24,-7 L 10,4 L 14,21 L 0,12 L -14,21 L -10,4 L -24,-7 L -6.5,-8 Z"
      : google.maps.SymbolPath.CIRCLE,
    scale: isSelected ? 0.9 : isWithinRadius ? 11 : 9.5,
    fillColor,
    fillOpacity: isWithinRadius ? 0.95 : 0.55,
    strokeColor: isSelected ? "#92400e" : "#ffffff",
    strokeWeight: isSelected ? 3 : 3
  };
}
