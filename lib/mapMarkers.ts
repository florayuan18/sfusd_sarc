import type { SchoolType } from "@/types/school";

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
  const fillColor = isSelected ? palette.selected : palette.base;

  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: isSelected ? 14 : isWithinRadius ? 11 : 9.5,
    fillColor,
    fillOpacity: isWithinRadius ? 0.95 : 0.55,
    strokeColor: "#ffffff",
    strokeWeight: isSelected ? 4 : 3
  };
}
