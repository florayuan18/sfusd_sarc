import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SchoolSearch } from "@/components/SchoolSearch";
import { reverseGeocodeCoordinates } from "@/lib/geocode";
import { loadGoogleMaps } from "@/lib/googleMaps";
import type { Coordinates, School } from "@/types/school";

type AddressSearchProps = {
  address: string;
  isSchoolDropdownOpen: boolean;
  onAddressChange: (value: string) => void;
  onAddressSelect: (address: string, coordinates: Coordinates) => void;
  onSearch: (address: string) => void;
  onSchoolDropdownOpenChange: (isOpen: boolean) => void;
  onSchoolQueryChange: (value: string) => void;
  onSchoolSelect: (school: School) => void;
  onUseCurrentLocation: (address: string, coordinates: Coordinates) => void;
  schoolQuery: string;
  schoolSuggestions: School[];
  centerSchool?: School;
};

export function AddressSearch({
  address,
  isSchoolDropdownOpen,
  onAddressChange,
  onAddressSelect,
  onSearch,
  onSchoolDropdownOpenChange,
  onSchoolQueryChange,
  onSchoolSelect,
  onUseCurrentLocation,
  schoolQuery,
  schoolSuggestions,
  centerSchool
}: AddressSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftAddress, setDraftAddress] = useState(address);
  const [autocompleteError, setAutocompleteError] = useState<string | null>(
    null
  );
  const [currentLocationError, setCurrentLocationError] = useState<
    string | null
  >(null);
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);

  useEffect(() => {
    setDraftAddress(address);
  }, [address]);

  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | undefined;
    let listener: google.maps.MapsEventListener | undefined;
    let isMounted = true;

    loadGoogleMaps()
      .then((google) => {
        if (!isMounted || !inputRef.current || !google.maps.places) {
          setAutocompleteError(
            "Address suggestions are unavailable. Check that Places API is enabled for the browser key."
          );
          return;
        }

        setAutocompleteError(null);

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

          const resolvedAddress = place.formatted_address || place.name || "";

          setDraftAddress(resolvedAddress);
          onAddressSelect(resolvedAddress, {
            lat: location.lat(),
            lng: location.lng()
          });
        });
      })
      .catch((error) => {
        setAutocompleteError(
          error instanceof Error
            ? error.message
            : "Address suggestions are unavailable."
        );
      });

    return () => {
      isMounted = false;
      listener?.remove();
    };
  }, [onAddressSelect]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setCurrentLocationError(
        "Current location is unavailable in this browser."
      );
      return;
    }

    setIsUsingCurrentLocation(true);
    setCurrentLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        const resolvedAddress =
          (await reverseGeocodeCoordinates(coordinates)) || "Current location";

        setDraftAddress(resolvedAddress);
        onUseCurrentLocation(resolvedAddress, coordinates);
        setIsUsingCurrentLocation(false);
      },
      (error) => {
        const messageByCode: Record<number, string> = {
          1: "Location permission was denied.",
          2: "Current location could not be determined.",
          3: "Current location request timed out."
        };

        setCurrentLocationError(
          messageByCode[error.code] || "Unable to access current location."
        );
        setIsUsingCurrentLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const handleSearch = () => {
    onSearch(draftAddress);
  };

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
            value={draftAddress}
            onChange={(event) => setDraftAddress(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="1234 Mission St, San Francisco, CA"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-accent focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <Button size="lg" onClick={handleSearch}>
          Search
        </Button>
      </div>
      {autocompleteError ? (
        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {autocompleteError}
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={isUsingCurrentLocation}
        className="mt-3 text-sm font-medium text-accent transition hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
        aria-disabled={isUsingCurrentLocation}
      >
        {isUsingCurrentLocation ? "Finding current location..." : "Use current location"}
      </button>
      {currentLocationError ? (
        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {currentLocationError}
        </div>
      ) : null}

      <div className="mt-5">
        <SchoolSearch
          isDropdownOpen={isSchoolDropdownOpen}
          onDropdownOpenChange={onSchoolDropdownOpenChange}
          onQueryChange={onSchoolQueryChange}
          onSelectSchool={onSchoolSelect}
          query={schoolQuery}
          selectedSchool={centerSchool}
          suggestions={schoolSuggestions}
        />
      </div>
    </Card>
  );
}
