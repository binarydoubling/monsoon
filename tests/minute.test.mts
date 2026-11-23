import assert from "node:assert/strict";
import test from "node:test";
import { forecastMinute } from "../src/minute.ts";
import type { ForecastHour } from "../src/weather.ts";

const start = Date.parse("2026-11-01T08:00:00Z") / 1000;

function hour(
  offset: number,
  overrides: Partial<ForecastHour> = {},
): ForecastHour {
  return {
    t: start + offset * 3600,
    c: -2 + 6 * offset,
    feelsLikeC: -6 + 4 * offset,
    precipMmPerHour: 2 * offset,
    hum: 80 - 12 * offset,
    cloudCover: offset === 0 ? 0 : 100,
    rain: 36 + 12 * offset,
    kmh: 12 + 12 * offset,
    pressure: 1000 + 6 * offset,
    dir: offset === 0 ? 350 : 10,
    day: offset > 0,
    desc: offset === 0 ? "Clear skies" : "Overcast",
    ...overrides,
  };
}

test("minute estimates interpolate each numeric reading and use the nearest sky conditions", () => {
  const hours = [hour(0), hour(1)];
  const t = start + 15 * 60;

  assert.deepEqual(forecastMinute(hours, start, 15), {
    t,
    hour: {
      t,
      c: -0.5,
      feelsLikeC: -5,
      precipMmPerHour: 2,
      hum: 77,
      cloudCover: 25,
      rain: 39,
      kmh: 15,
      pressure: 1001.5,
      dir: 355,
      day: false,
      desc: "Clear skies",
    },
  });

  const midpoint = forecastMinute(hours, start, 30).hour!;
  assert.equal(midpoint.dir, 0);
  assert.equal(midpoint.desc, "Overcast");
  assert.equal(midpoint.day, true);

  assert.equal(
    forecastMinute([hour(0, { dir: 10 }), hour(1, { dir: 350 })], start, 45)
      .hour?.dir,
    355,
  );
});

test("all 1440 minutes have distinct timestamps and the final minute uses tomorrow's first hour", () => {
  const hours = Array.from({ length: 25 }, (_, i) => hour(i));

  for (let i = 0; i < 1440; i++) {
    const { t, hour: reading } = forecastMinute(hours, start, i);
    assert.equal(t, start + i * 60);
    assert.equal(reading?.t, t);
    if (i % 60 === 0) assert.equal(reading, hours[i / 60]);
  }

  assert.equal(forecastMinute(hours, start, 1439).hour?.c, 141.9);
  assert.equal(forecastMinute(hours.slice(0, 24), start, 1439).hour, undefined);
});

test("absent hours stay gaps and missing variables stay unknown between valid readings", () => {
  const hours = [
    hour(0, { pressure: undefined, dir: null, cloudCover: undefined }),
    hour(1, { hum: null }),
    hour(3),
  ];

  const reading = forecastMinute(hours, start, 20).hour!;
  assert.equal(reading.c, 0);
  assert.equal(reading.pressure, null);
  assert.equal(reading.cloudCover, null);
  assert.equal(reading.hum, null);
  assert.equal(reading.dir, null);
  assert.equal(forecastMinute(hours, start, 120).hour, undefined);
  assert.equal(forecastMinute(hours, start, 150).hour, undefined);
  assert.equal(forecastMinute(hours, start, 180).hour, hours[2]);
  assert.equal(forecastMinute([], start, 0).hour, undefined);
});

test("the window can start partway through a forecast hour", () => {
  const hours = [hour(0), hour(1), hour(2)];
  const windowStart = start + 45 * 60;
  assert.equal(forecastMinute(hours, windowStart, 0).hour?.c, 2.5);
  assert.equal(forecastMinute(hours, windowStart, 15).hour, hours[1]);
});

test("interpolates minutes across the full forecast including the final hour", () => {
  const hours = [hour(165), hour(166), hour(167)];
  assert.equal(forecastMinute(hours, start, 166 * 60 + 30).hour?.c, 997);
  assert.equal(forecastMinute(hours, start, 167 * 60).hour, hours[2]);
});
