let loadPromise: Promise<void> | null = null;

export function loadMaps(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Maps must be loaded client-side"));
      return;
    }
    // Already loaded
    if ((window as any).google?.maps) {
      resolve();
      return;
    }
    const callbackName = "__gmaps_ready__";
    (window as any)[callbackName] = resolve;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry&v=weekly&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

// Keep the same call signature so components don't need to change
export async function loadMapsLibrary(_lib: string): Promise<void> {
  return loadMaps();
}

export interface PlaceDetails {
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  placeId: string;
}
