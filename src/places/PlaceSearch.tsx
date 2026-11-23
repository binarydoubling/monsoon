import { useEffect, useState } from "react";
import {
  coordinatePlace,
  getJSON,
  places,
  type Place,
} from "../forecast/weather";
import { AtlasText, box, ink, sub } from "../shared/ui";
import PlaceList from "./PlaceList";

interface SearchResponse {
  results?: {
    name: string;
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
  }[];
}

export default function PlaceSearch({
  onSelect,
}: {
  onSelect: (place: Place) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(places);
  const [searchState, setSearchStatus] = useState("");

  useEffect(() => {
    const text = query.trim(),
      ctrl = new AbortController();

    const cached = places.filter((p) =>
      (p.name + " " + p.region).toLowerCase().includes(text.toLowerCase()),
    );

    setResults(cached);
    setSearchStatus("");
    if (!text) return;

    const coord = text.match(
      /^\s*([+-]?\d+(?:\.\d+)?)\s*[, ]\s*([+-]?\d+(?:\.\d+)?)\s*$/,
    );

    if (coord) {
      const lat = Number(coord[1]),
        lon = Number(coord[2]);

      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180)
        setResults([coordinatePlace({ lat, lon })]);
      else
        setSearchStatus(
          "Latitude must be within ±90° and longitude within ±180°.",
        );

      return;
    }

    if (text.length < 2) return;
    setSearchStatus("Searching…");

    const timer = setTimeout(async () => {
      try {
        const v = await getJSON<SearchResponse>(
          "https://geocoding-api.open-meteo.com/v1/search?count=8&language=en&name=" +
            encodeURIComponent(text),
          ctrl.signal,
        );

        if (ctrl.signal.aborted) return;

        const rows = (v.results || []).map((p) => ({
          name: p.name,
          region: [p.admin1, p.country].filter(Boolean).join(", "),
          lat: p.latitude,
          lon: p.longitude,
        }));

        setResults(rows.length ? rows : cached);

        setSearchStatus(
          rows.length || cached.length
            ? ""
            : "No places found. Try coordinates.",
        );
      } catch {
        if (!ctrl.signal.aborted)
          setSearchStatus(
            "Place search is offline. You can still enter coordinates.",
          );
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  return (
    <>
      <input
        aria-label="Place name or coordinates"
        autoFocus
        placeholder="Place name or latitude, longitude"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) onSelect(results[0]);
        }}
        style={{
          ...box,
          padding: 12,
          fontSize: 16,
          color: ink,
        }}
      />
      {searchState && (
        <AtlasText size={12} color={sub}>
          {searchState}
        </AtlasText>
      )}
      <PlaceList places={results} onSelect={onSelect} />
    </>
  );
}
