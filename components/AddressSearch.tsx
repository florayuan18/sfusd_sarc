import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { loadGoogleMaps } from "@/lib/googleMaps";
import type { Coordinates } from "@/types/school";

type AddressSearchProps = {
  address: string;
  onAddressChange: (value: string) => void;
  onAddressSelect: (address: string, coordinates: Coordinates) => void;
  onSearch: () => void;
};

export function AddressSearch({
  address,
  onAddressChange,
  onAddressSelect,
  onSearch
}: AddressSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | undefined;
    let listener: google.maps.MapsEventListener | undefined;
    let isMounted = true;

    loadGoogleMaps()
      .then((google) => {
        if (!isMounted || !inputRef.current || !google.maps.places) {
          return;
        }

        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: {
            country: "us"
          },
          fields: ["formatted_address", "geometry", "name"],
          types: ["address"]
        });

        const sanFranciscoBounds = new google.maps.LatLngBounds(
          { lat: 37.604, lng: -122.56 },
          { lat: 37.833, lng: -122.35 }
        );

        autocomplete.setBounds(sanFranciscoBounds);
        autocomplete.setOptions({ strictBounds: false });

        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          const location = place?.geometry?.location;

          if (!location) {
            return;
          }

          onAddressSelect(place.formatted_address || place.name || "", {
            lat: location.lat(),
            lng: location.lng()
          });
        });
      })
      .catch(() => {
        // The map panel already explains missing/invalid Maps setup.
      });

    return () => {
      isMounted = false;
      listener?.remove();
    };
  }, [onAddressSelect]);

  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <label className="flex-1">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Home address in San Francisco
          </span>
          <input
            ref={inputRef}
            type="text"
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
            placeholder="1234 Mission St, San Francisco, CA"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-accent focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <Button size="lg" onClick={onSearch}>
          Search
        </Button>
      </div>
      <button
        type="button"
        disabled
        className="mt-3 text-sm font-medium text-slate-400"
        aria-disabled="true"
      >
        Use current location
      </button>
    </Card>
  );
}
