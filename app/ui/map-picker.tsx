"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker, LeafletMouseEvent } from "leaflet";
import { inputClass } from "@/app/ui/style";

type LatLng = { lat: number; lng: number };
type SearchResult = { display_name: string; lat: string; lon: string };

// Inline SVG pin so we don't depend on Leaflet's default marker image assets,
// which break under the bundler.
const PIN_HTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" fill="#dc2626" stroke="white" stroke-width="1.5"/>
  <circle cx="12" cy="10" r="2.5" fill="white"/>
</svg>`;

export default function MapPicker({
  defaultLat,
  defaultLng,
  center,
  zoom = 13,
}: {
  defaultLat?: number | null;
  defaultLng?: number | null;
  center?: [number, number];
  zoom?: number;
}) {
  const seeded =
    defaultLat != null && defaultLng != null
      ? { lat: defaultLat, lng: defaultLng }
      : null;

  const [pos, setPos] = useState<LatLng | null>(seeded);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // Leaflet is imported lazily on the client (it touches `window` at import,
  // so it must never load during SSR).
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  // Draw/move the marker on the map. Pure Leaflet — no React state.
  function syncMarker(p: LatLng) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng(p);
    } else {
      const icon = L.divIcon({
        className: "",
        html: PIN_HTML,
        iconSize: [30, 30],
        iconAnchor: [15, 29],
      });
      const m = L.marker(p, { icon, draggable: true }).addTo(map);
      m.on("dragend", () => {
        const ll = m.getLatLng();
        setPos({ lat: ll.lat, lng: ll.lng });
      });
      markerRef.current = m;
    }
  }

  // User picked a point: update both state and the marker.
  function selectPos(p: LatLng) {
    setPos(p);
    syncMarker(p);
  }

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const start: [number, number] = seeded
        ? [seeded.lat, seeded.lng]
        : (center ?? [46.5, 11]); // Alps-ish default; search jumps elsewhere
      const map = L.map(containerRef.current).setView(start, seeded ? zoom : 5);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      if (seeded) syncMarker(seeded);

      map.on("click", (e: LeafletMouseEvent) =>
        selectPos({ lat: e.latlng.lat, lng: e.latlng.lng }),
      );

      // The map frequently mounts at 0×0 inside a closed <dialog>; recompute its
      // size once the container actually has dimensions (i.e. the modal opens).
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } },
      );
      setResults(res.ok ? await res.json() : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function choose(r: SearchResult) {
    const p = { lat: Number(r.lat), lng: Number(r.lon) };
    mapRef.current?.setView([p.lat, p.lng], 15);
    selectPos(p);
    setResults([]);
    setQuery("");
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="latitude" value={pos?.lat ?? ""} />
      <input type="hidden" name="longitude" value={pos?.lng ?? ""} />

      {/* Search */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search(e);
            }}
            placeholder="Search a place…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={search}
            disabled={searching}
            className="shrink-0 rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            {searching ? "…" : "Search"}
          </button>
        </div>
        {results.length > 0 && (
          <ul className="absolute z-[1000] mt-1 max-h-48 w-full overflow-auto rounded border border-zinc-200 bg-white text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  className="block w-full px-3 py-2 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded border border-zinc-200 dark:border-zinc-800"
      />

      <p className="text-xs text-zinc-500">
        {pos
          ? `Selected: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`
          : "Search, then click the map to drop a pin."}
      </p>
    </div>
  );
}
