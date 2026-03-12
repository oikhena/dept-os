"use client";

import { useEffect, useRef, useState } from "react";
import { loadMapsLibrary, type PlaceDetails } from "../../lib/maps/loader";
import { RAD, CLR, FONT, TXT } from "../../styles/tokens";

interface Props {
  value: string;
  onChange: (text: string) => void;
  onPlaceSelect: (place: PlaceDetails | null) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function PlacesAutocomplete({ value, onChange, onPlaceSelect, placeholder, disabled, style }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return;
    loadMapsLibrary("places").then(() => setReady(true)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["establishment"],
      fields: ["name", "formatted_address", "geometry", "types", "place_id"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) {
        onPlaceSelect(null);
        return;
      }
      const details: PlaceDetails = {
        name: place.name || "",
        address: place.formatted_address || "",
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        types: place.types || [],
        placeId: place.place_id || "",
      };
      onChange(place.name || "");
      onPlaceSelect(details);
    });

    autocompleteRef.current = autocomplete;
  }, [ready, onChange, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => { onChange(e.target.value); onPlaceSelect(null); }}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        background: "#f8fafc",
        border: `1px solid ${CLR.borderDefault}`,
        color: "#1e293b",
        padding: "9px 12px",
        borderRadius: RAD.sm,
        fontSize: TXT.md,
        fontFamily: FONT.sans,
        outline: "none",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}
