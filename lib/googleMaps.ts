const GOOGLE_MAPS_SCRIPT_ID = "sarc-google-maps-script";

let googleMapsPromise: Promise<typeof google> | undefined;

declare global {
  interface Window {
    gm_authFailure?: () => void;
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

  if (window.google?.maps?.places) {
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
    const timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          "Google Maps timed out. Check Maps JavaScript API, Places API, billing, and key restrictions."
        )
      );
    }, 12000);

    const finish = () => {
      window.clearTimeout(timeoutId);
      delete window.__initSarcGoogleMaps;
      delete window.gm_authFailure;
    };

    window.gm_authFailure = () => {
      finish();
      googleMapsPromise = undefined;
      reject(
        new Error(
          "Google Maps rejected the API key. Check API enablement, billing, and HTTP referrer restrictions."
        )
      );
    };

    window.__initSarcGoogleMaps = () => {
      finish();
      resolve(window.google);
    };

    if (existingScript) {
      if (window.google?.maps?.places) {
        finish();
        resolve(window.google);
        return;
      }

      existingScript.addEventListener("error", () => {
        finish();
        googleMapsPromise = undefined;
        reject(new Error("Failed to load Google Maps."));
      });
      return;
    }

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      callback: "__initSarcGoogleMaps",
      libraries: "places",
      v: "weekly"
    });

    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      finish();
      googleMapsPromise = undefined;
      reject(new Error("Failed to load Google Maps."));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
