"use client";

import { useEffect, useRef, useState } from "react";
import type { Department } from "../../types/department";
import { loadMapsLibrary } from "../../lib/maps/loader";
import { CLR, FONT, TXT, RAD } from "../../styles/tokens";

interface NearbyResult {
  name: string;
  vicinity: string;
  distance?: number; // meters
}

interface Props {
  dept: Department;
  accentColor: string;
}

function inferContext(dept: Department): { type: string; radius: number } {
  const combined = dept.label.toLowerCase() + " " + (dept.roles || []).map(r => r.label.toLowerCase()).join(" ");
  if (combined.match(/hospital|clinic|health|medical|nurse|doctor|patient/))
    return { type: "hospital", radius: 15000 };
  if (combined.match(/school|educat|teacher|student|class|learn/))
    return { type: "school", radius: 3000 };
  if (combined.match(/dispatch|emergency|fire|police|rescue|ambulance/))
    return { type: "fire_station", radius: 50000 };
  if (combined.match(/water|sewage|utility|infrastructure|power|energy/))
    return { type: "local_government_office", radius: 30000 };
  return { type: "establishment", radius: 20000 };
}

export default function DeptMapTab({ dept, accentColor }: Props) {
  // containerRef is the React-managed div — overlays live here
  // Google Maps gets its OWN imperatively-created div inside it
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [nearby, setNearby] = useState<NearbyResult[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setStatus("error");
      setErrorMsg("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.");
      return;
    }

    let cancelled = false;

    // Create an isolated div for Google Maps — React never touches this node
    const mapDiv = document.createElement("div");
    mapDiv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";

    async function init() {
      try {
        await Promise.all([loadMapsLibrary("maps"), loadMapsLibrary("places"), loadMapsLibrary("geometry")]);
        if (cancelled) return;
        if (!containerRef.current) return;

        containerRef.current.appendChild(mapDiv);

        // Resolve coordinates
        let coords = dept.coordinates;
        if (!coords) {
          const geocoder = new google.maps.Geocoder();
          const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
            geocoder.geocode({ address: dept.region || dept.label }, (results, s) => {
              resolve(s === "OK" && results?.[0] ? results[0] : null);
            });
          });
          if (result) {
            coords = { lat: result.geometry.location.lat(), lng: result.geometry.location.lng() };
          }
        }

        if (cancelled) return;

        if (!coords) {
          setStatus("error");
          setErrorMsg(`Could not locate "${dept.region || dept.label}". Add a region to the department.`);
          return;
        }

        setCenter(coords);

        const { type: placeType, radius } = inferContext(dept);
        const isFieldDept = dept.infrastructure === "limited-connectivity" || dept.infrastructure === "mobile-first";

        const map = new google.maps.Map(mapDiv, {
          center: coords,
          zoom: 13,
          mapTypeId: isFieldDept ? "satellite" : "roadmap",
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          styles: isFieldDept ? [] : [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });

        new google.maps.Marker({
          position: coords,
          map,
          title: dept.label,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: accentColor,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        });

        new google.maps.Circle({
          map,
          center: coords,
          radius,
          fillColor: accentColor,
          fillOpacity: 0.06,
          strokeColor: accentColor,
          strokeOpacity: 0.25,
          strokeWeight: 1.5,
        });

        const service = new google.maps.places.PlacesService(map);
        service.nearbySearch(
          { location: coords, radius: radius * 0.4, type: placeType as string },
          (results, nearbyStatus) => {
            if (cancelled) return;
            if (nearbyStatus === google.maps.places.PlacesServiceStatus.OK && results) {
              results.slice(0, 8).forEach(place => {
                if (!place.geometry?.location) return;
                new google.maps.Marker({
                  position: place.geometry.location,
                  map,
                  title: place.name,
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: "#94a3b8",
                    fillOpacity: 0.7,
                    strokeColor: "#ffffff",
                    strokeWeight: 1.5,
                  },
                });
              });

              const origin = new google.maps.LatLng(coords!.lat, coords!.lng);
              setNearby(
                results.slice(0, 5).map(place => ({
                  name: place.name || "Unknown",
                  vicinity: place.vicinity || "",
                  distance: place.geometry?.location
                    ? google.maps.geometry.spherical.computeDistanceBetween(origin, place.geometry.location)
                    : undefined,
                }))
              );
            }
          }
        );

        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg((err as Error).message || "Failed to load map.");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      mapDiv.remove(); // detach Google Maps' div without involving React
    };
  }, [dept.label, dept.region, dept.coordinates, dept.infrastructure, accentColor, apiKey]);

  if (!apiKey) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 32 }}>🗺️</div>
        <div style={{ fontFamily: FONT.sans, fontSize: TXT.sm, color: CLR.textMuted, textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
          Add <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 3 }}>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your <code>.env.local</code> to enable the map tab.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* Outer div: React manages overlays here; Google Maps div is appended imperatively */}
      <div ref={containerRef} style={{ flex: 1, position: "relative" }}>
        {status === "loading" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fb", zIndex: 2 }}>
            <div style={{ fontFamily: FONT.sans, fontSize: TXT.sm, color: CLR.textMuted }}>Locating {dept.region || dept.label}…</div>
          </div>
        )}
        {status === "error" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fb", zIndex: 2, flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 28 }}>📍</div>
            <div style={{ fontFamily: FONT.sans, fontSize: TXT.sm, color: CLR.textMuted, textAlign: "center", maxWidth: 280 }}>{errorMsg}</div>
          </div>
        )}
      </div>

      {status === "ready" && (
        <div style={{ width: 220, flexShrink: 0, borderLeft: `1px solid ${CLR.borderDefault}`, background: "#fafbfc", display: "flex", flexDirection: "column", padding: 14, gap: 14, overflowY: "auto" }}>
          {center && (
            <div>
              <div style={{ fontSize: 10, fontFamily: FONT.sans, fontWeight: 600, color: CLR.textMuted, letterSpacing: "0.08em", marginBottom: 6 }}>LOCATION</div>
              <div style={{ fontSize: TXT.sm, fontFamily: FONT.sans, color: CLR.textPrimary, fontWeight: 600 }}>{dept.region || dept.label}</div>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: CLR.textMuted, marginTop: 2 }}>
                {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
              </div>
            </div>
          )}

          {dept.infrastructure && (
            <div>
              <div style={{ fontSize: 10, fontFamily: FONT.sans, fontWeight: 600, color: CLR.textMuted, letterSpacing: "0.08em", marginBottom: 6 }}>INFRASTRUCTURE</div>
              <div style={{
                fontSize: 10, fontFamily: FONT.sans, fontWeight: 600,
                color: dept.infrastructure === "limited-connectivity" ? "#f59e0b" : dept.infrastructure === "mobile-first" ? "#34d399" : "#60a5fa",
                background: "#f1f5f9", padding: "2px 8px", borderRadius: RAD.sm, display: "inline-block",
              }}>
                {dept.infrastructure}
              </div>
            </div>
          )}

          {nearby.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontFamily: FONT.sans, fontWeight: 600, color: CLR.textMuted, letterSpacing: "0.08em", marginBottom: 8 }}>NEARBY PEERS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {nearby.map((n, i) => (
                  <div key={i} style={{ borderLeft: `2px solid ${accentColor}40`, paddingLeft: 8 }}>
                    <div style={{ fontSize: 11, fontFamily: FONT.sans, color: CLR.textPrimary, fontWeight: 500, lineHeight: 1.3 }}>{n.name}</div>
                    {n.distance !== undefined && (
                      <div style={{ fontSize: 10, fontFamily: FONT.sans, color: CLR.textMuted, marginTop: 1 }}>
                        {n.distance < 1000 ? `${Math.round(n.distance)}m` : `${(n.distance / 1000).toFixed(1)}km`} away
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.sans, fontWeight: 600, color: CLR.textMuted, letterSpacing: "0.08em", marginBottom: 6 }}>SERVICE AREA</div>
            <div style={{ fontSize: 10, fontFamily: FONT.sans, color: CLR.textSecondary }}>
              {inferContext(dept).radius / 1000}km radius shown
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
