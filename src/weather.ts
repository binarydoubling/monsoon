import snapshot from "./reykjavik.json";
export interface Coordinates {
  lat: number;
  lon: number;
}
export interface Place extends Coordinates {
  name: string;
  region: string;
}
export interface ForecastHour {
  t: number;
  c: number;
  hum: number | null;
  rain: number | null;
  kmh: number | null;
  dir: number | null;
  pressure?: number | null;
  desc: string;
  day: boolean;
}
export interface Forecast {
  source: "NWS" | "Open-Meteo";
  zone: string;
  hours: ForecastHour[];
}
type MeteoResponse = {
  timezone: string;
  hourly: { time: number[] } & Record<
    Exclude<keyof typeof snapshot.hourly, "time">,
    (number | null)[]
  >;
};
interface NwsPoint {
  properties: { timeZone: string; forecastHourly: string };
}
interface NwsHourly {
  properties: {
    periods: {
      temperature: number | null;
      temperatureUnit: string;
      startTime: string;
      shortForecast: string;
      isDaytime: boolean;
      windSpeed: string;
      windDirection: string;
      relativeHumidity?: { value: number | null };
      probabilityOfPrecipitation?: { value: number | null };
    }[];
  };
}
export const home: Place = {
  name: "Reykjavík",
  region: "Iceland",
  lat: 64.1466,
  lon: -21.9426,
};
export const places: Place[] = [
  home,
  { name: "Anchorage", region: "Alaska, US", lat: 61.2181, lon: -149.9003 },
  { name: "Seattle", region: "Washington, US", lat: 47.6062, lon: -122.3321 },
  { name: "Tokyo", region: "Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Cape Town", region: "South Africa", lat: -33.9249, lon: 18.4241 },
  { name: "Wellington", region: "New Zealand", lat: -41.2865, lon: 174.7762 },
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
export function condition(n: number | null) {
  if (n == null) return "Conditions unavailable";
  if (n === 0) return "Clear skies";
  if (n === 1) return "Mostly clear";
  if (n === 2) return "Partly cloudy";
  if (n === 3) return "Overcast";
  if (n <= 48) return "Fog";
  if (n <= 57) return "Drizzle";
  if (n === 61) return "Light rain";
  if (n === 65) return "Heavy rain";
  if (n <= 67) return "Rain";
  if (n <= 77) return "Snow";
  if (n <= 82) return "Rain showers";
  if (n <= 86) return "Snow showers";
  return "Thunderstorms";
}
export const temp = (c: number, f: boolean) =>
  Math.round(f ? (c * 9) / 5 + 32 : c);
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
function meteo(data: MeteoResponse): Forecast {
  const h = data.hourly;
  return {
    source: "Open-Meteo",
    zone: data.timezone,
    hours: h.time
      .map((t, i) => ({
        t,
        c: h.temperature_2m[i],
        hum: h.relative_humidity_2m[i],
        rain: h.precipitation_probability[i],
        kmh: h.wind_speed_10m[i],
        dir: h.wind_direction_10m[i],
        pressure: h.surface_pressure[i],
        desc: condition(h.weather_code[i]),
        day: h.is_day[i] === 1,
      }))
      .filter(
        (h): h is typeof h & { c: number } =>
          h.c !== null && Number.isFinite(h.c),
      ),
  };
}
export const seed = meteo(snapshot);
const memo = new Map<string, { at: number; value: Forecast }>();
export async function forecast(
  p: Place,
  signal: AbortSignal,
): Promise<Forecast> {
  const id = key(p),
    old = memo.get(id);
  if (old && Date.now() - old.at < 15 * 60000) return old.value;
  let value: Forecast | undefined;
  const us =
    (p.lat >= 17.5 && p.lat <= 72 && (p.lon < -60 || p.lon > 170)) ||
    (p.lat > 12 && p.lat < 21 && p.lon > 144 && p.lon < 146) ||
    (p.lat < -10 && p.lat > -16 && p.lon < -168 && p.lon > -173);
  if (us)
    try {
      const meta = (
        await getJSON<NwsPoint>("https://api.weather.gov/points/" + id, signal)
      ).properties;
      const data = (await getJSON<NwsHourly>(meta.forecastHourly, signal))
        .properties;
      const hours = data.periods
        .filter(
          (h): h is typeof h & { temperature: number } => h.temperature != null,
        )
        .map((h) => ({
          t: Date.parse(h.startTime) / 1000,
          c:
            h.temperatureUnit === "F"
              ? ((h.temperature - 32) * 5) / 9
              : h.temperature,
          desc: h.shortForecast,
          day: h.isDaytime,
          kmh:
            parseFloat(h.windSpeed) *
            (h.windSpeed.includes("mph") ? 1.609344 : 1),
          dir:
            [
              "N",
              "NNE",
              "NE",
              "ENE",
              "E",
              "ESE",
              "SE",
              "SSE",
              "S",
              "SSW",
              "SW",
              "WSW",
              "W",
              "WNW",
              "NW",
              "NNW",
            ].indexOf(h.windDirection) * 22.5,
          hum: h.relativeHumidity?.value ?? null,
          rain: h.probabilityOfPrecipitation?.value ?? null,
        }));
      if (hours.some((h) => h.t > Date.now() / 1000))
        value = { source: "NWS", zone: meta.timeZone, hours };
    } catch (e) {
      if (signal.aborted) throw e;
    }
  if (!value)
    value = meteo(
      await getJSON<MeteoResponse>(
        "https://api.open-meteo.com/v1/forecast?latitude=" +
          p.lat +
          "&longitude=" +
          p.lon +
          "&timezone=auto&timeformat=unixtime&forecast_days=4&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,wind_direction_10m,weather_code,surface_pressure,is_day",
        signal,
      ),
    );
  if (!value.hours.some((h) => h.t + 3600 > Date.now() / 1000))
    throw Error("Forecast expired");
  memo.set(id, { at: Date.now(), value });
  return value;
}
