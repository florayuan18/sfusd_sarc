const GOOGLE_MAPS_SCRIPT_ID = "sarc-google-maps-script";

let googleMapsPromise: Promise<typeof google> | undefined;

declare global {
  interface Window {
    __initSarcGoogleMaps?: () => void;
  }
}

export function isGoogleMapsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
}

export function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in a browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.")
    );
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    window.__initSarcGoogleMaps = () => {
      resolve(window.google);
      delete window.__initSarcGoogleMaps;
    };

    if (existingScript) {
      existingScript.addEventListener("error", () => {
        reject(new Error("Failed to load Google Maps."));
      });
      return;
    }

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      callback: "__initSarcGoogleMaps",
      v: "weekly"
    });

    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps."));

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
