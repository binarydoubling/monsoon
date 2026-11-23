import type { ForecastHour } from "../weather";

export function forecastMinute(
  hours: readonly ForecastHour[],
  start: number,
  minute: number,
): { t: number; hour: ForecastHour | undefined } {
  const offset = Math.max(0, Math.round(minute));
  const t = start + offset * 60;
  const index = hours.findIndex((hour) => hour.t >= t);
  const after = hours[index];
  if (after?.t === t) return { t, hour: after };

  const before = hours[index - 1];

  if (!before || !after || after.t - before.t !== 3600)
    return { t, hour: undefined };

  const fraction = (t - before.t) / 3600;
  const lerp = (a: number, b: number) => a + (b - a) * fraction;

  const blend = (a?: number | null, b?: number | null) =>
    a == null || b == null ? null : lerp(a, b);

  let dir = null;

  if (
    before.dir != null &&
    before.dir >= 0 &&
    after.dir != null &&
    after.dir >= 0
  ) {
    const turn = ((after.dir - before.dir + 540) % 360) - 180;
    dir = (before.dir + turn * fraction + 360) % 360;
  }

  const nearest = fraction < 0.5 ? before : after;

  return {
    t,
    hour: {
      t,
      c: lerp(before.c, after.c),
      feelsLikeC: blend(before.feelsLikeC, after.feelsLikeC),
      // Open-Meteo timestamps precipitation at the end of its accumulation interval.
      precipMmPerHour: after.precipMmPerHour ?? null,
      hum: blend(before.hum, after.hum),
      rain: blend(before.rain, after.rain),
      kmh: blend(before.kmh, after.kmh),
      pressure: blend(before.pressure, after.pressure),
      cloudCover: blend(before.cloudCover, after.cloudCover),
      dir,
      desc: nearest.desc,
      day: nearest.day,
    },
  };
}
