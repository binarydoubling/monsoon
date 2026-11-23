import snapshot from "./reykjavik.json" with { type: "json" };

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Place extends Coordinates {
  name: string;
  region: string;
  resolveName?: boolean;
}

export interface ForecastHour {
  t: number;
  c: number;
  hum: number | null;
  rain: number | null;
  kmh: number | null;
  dir: number | null;
  pressure?: number | null;
  cloudCover?: number | null;
  desc: string;
  day: boolean;
}

export interface ForecastDay {
  date: string;
  high: number | null;
  low: number | null;
  rain: number | null;
  desc: string;
}

export interface Forecast {
  source: "Open-Meteo";
  zone: string;
  current: ForecastHour | null;
  daily: ForecastDay[];
  hours: ForecastHour[];
}

const weatherVariables = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation_probability",
  "wind_speed_10m",
  "wind_direction_10m",
  "weather_code",
  "surface_pressure",
  "is_day",
  "cloud_cover",
] as const;

const dailyVariables = [
  "temperature_2m_max",
  "temperature_2m_min",
  "weather_code",
  "precipitation_probability_max",
] as const;

type WeatherVariable = (typeof weatherVariables)[number];

type WeatherValues<T> = Record<Exclude<WeatherVariable, "cloud_cover">, T> & {
  cloud_cover?: T;
};

type MeteoResponse = {
  timezone: string;
  utc_offset_seconds: number;
  current?: { time: number } & WeatherValues<number | null>;
  daily?: { time: number[] } & Record<
    (typeof dailyVariables)[number],
    (number | null)[]
  >;
  hourly: { time: number[] } & WeatherValues<(number | null)[]>;
};

export const home: Place = {
  name: "Reykjavík",
  region: "Capital Region, Iceland",
  lat: 64.1466,
  lon: -21.9426,
};

export const places: Place[] = [
  home,
  {
    name: "Anchorage",
    region: "Alaska, United States",
    lat: 61.2181,
    lon: -149.9003,
  },
  {
    name: "Seattle",
    region: "Washington, United States",
    lat: 47.6062,
    lon: -122.3321,
  },
  { name: "Tokyo", region: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
  {
    name: "Cape Town",
    region: "Western Cape, South Africa",
    lat: -33.9249,
    lon: 18.4241,
  },
  {
    name: "Wellington",
    region: "Wellington Region, New Zealand",
    lat: -41.2865,
    lon: 174.7762,
  },
];

export const coords = (p: Coordinates) =>
  Math.abs(p.lat).toFixed(2) +
  "°" +
  (p.lat < 0 ? "S" : "N") +
  "  " +
  Math.abs(p.lon).toFixed(2) +
  "°" +
  (p.lon < 0 ? "W" : "E");

export const key = (p: Coordinates) =>
  p.lat.toFixed(4) + "," + p.lon.toFixed(4);

export const coordinatePlace = (p: Coordinates): Place => ({
  lat: p.lat,
  lon: p.lon,
  name: coords(p),
  region: "Selected coordinates",
  resolveName: true,
});

export function condition(n: number | null) {
  if (n == null) return "Conditions unavailable";
  if (n === 0) return "Clear skies";
  if (n === 1) return "Mostly clear";
  if (n === 2) return "Partly cloudy";
  if (n === 3) return "Overcast";
  if (n === 45 || n === 48) return "Fog";
  if ([51, 53, 55, 56, 57].includes(n)) return "Drizzle";
  if (n === 61) return "Light rain";
  if (n === 65) return "Heavy rain";
  if ([63, 66, 67].includes(n)) return "Rain";
  if (n === 71) return "Light snow";
  if (n === 75) return "Heavy snow";
  if (n === 77) return "Snow grains";
  if (n === 73) return "Snow";
  if ([80, 81, 82].includes(n)) return "Rain showers";
  if (n === 86) return "Heavy snow showers";
  if (n === 85) return "Light snow showers";
  if ([95, 96, 99].includes(n)) return "Thunderstorms";
  return "Conditions unavailable";
}

export function temp(c: number, f: boolean, decimals = 0) {
  const scale = 10 ** decimals;
  return Math.round((f ? (c * 9) / 5 + 32 : c) * scale) / scale;
}

export const wind = (k: number | null, f: boolean) =>
  k === null || !Number.isFinite(k) ? null : Math.round(f ? k / 1.609344 : k);

export const compass = (d: number | null) =>
  d === null || !Number.isFinite(d) || d < 0
    ? ""
    : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(d / 45) % 8];

export function local(
  t: number,
  zone: string,
  opts: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-US", { timeZone: zone, ...opts }).format(
    t * 1000,
  );
}

export async function getJSON<T>(url: string, signal: AbortSignal): Promise<T> {
  const control = new AbortController();
  const abort = () => control.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort);
  const timer = setTimeout(abort, 8500);

  try {
    const r = await fetch(url, {
      signal: control.signal,
      headers: { Accept: "application/json" },
    });

    if (!r.ok) throw Error("Service unavailable");
    return await r.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

type PlaceLabel = Pick<Place, "name" | "region">;
const placeLabels = new Map<string, PlaceLabel>();

export async function reverseGeocode(p: Coordinates, signal: AbortSignal) {
  const id = key(p);
  const cached = placeLabels.get(id);
  if (cached) return cached;

  const params = new URLSearchParams({
    lat: String(p.lat),
    lon: String(p.lon),
    lang: "en",
    radius: "3",
    limit: "1",
  });

  const result = await getJSON<{
    features: { properties: Record<string, string | undefined> }[];
  }>(`https://photon.komoot.io/reverse?${params}`, signal);

  const place = result.features[0]?.properties;
  if (!place) return;

  const locality =
    place.city ||
    (place.osm_key === "place" || place.osm_key === "natural"
      ? place.name
      : undefined);

  const name =
    locality || place.district || place.county || place.state || place.country;

  if (!name) return;

  const region = [...new Set([place.state, place.country])]
    .filter((part) => part && part !== name)
    .join(", ");

  const label = { name, region };
  placeLabels.set(id, label);
  return label;
}

function reading(
  t: number,
  value: (key: WeatherVariable) => number | null,
): ForecastHour | null {
  const c = value("temperature_2m");
  if (!Number.isFinite(t) || c == null || !Number.isFinite(c)) return null;

  return {
    t,
    c,
    hum: value("relative_humidity_2m"),
    rain: value("precipitation_probability"),
    kmh: value("wind_speed_10m"),
    dir: value("wind_direction_10m"),
    pressure: value("surface_pressure"),
    cloudCover: value("cloud_cover"),
    desc: condition(value("weather_code")),
    day: value("is_day") === 1,
  };
}

function meteo(data: MeteoResponse): Forecast {
  const { hourly, current, daily } = data;

  return {
    source: "Open-Meteo",
    zone: data.timezone,
    current: current
      ? reading(current.time, (key) => current[key] ?? null)
      : null,
    daily:
      daily?.time.map((t, i) => ({
        // Open-Meteo aggregates daily values using its fixed response offset, even across DST.
        date: new Date((t + data.utc_offset_seconds) * 1000)
          .toISOString()
          .slice(0, 10),
        high: daily.temperature_2m_max[i],
        low: daily.temperature_2m_min[i],
        rain: daily.precipitation_probability_max[i],
        desc: condition(daily.weather_code[i]),
      })) ?? [],
    hours: hourly.time
      .map((t, i) => reading(t, (key) => hourly[key]?.[i] ?? null))
      .filter((h) => h !== null),
  };
}

export const seed = meteo(snapshot);
const memo = new Map<string, { at: number; value: Forecast }>();

export async function forecast(
  p: Coordinates,
  signal: AbortSignal,
): Promise<Forecast> {
  const id = key(p),
    old = memo.get(id);

  if (old && Date.now() - old.at < 15 * 60000) return old.value;

  const params = new URLSearchParams({
    latitude: String(p.lat),
    longitude: String(p.lon),
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: "7",
    current: weatherVariables.join(","),
    daily: dailyVariables.join(","),
    hourly: weatherVariables.join(","),
  });

  const value = meteo(
    await getJSON<MeteoResponse>(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      signal,
    ),
  );

  if (!value.hours.some((h) => h.t + 3600 > Date.now() / 1000))
    throw Error("Forecast expired");

  memo.set(id, { at: Date.now(), value });
  return value;
}
