import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../src/forecast/reykjavik.json" with { type: "json" };
import { condition, forecast } from "../src/forecast/weather.ts";

test("a US point gets current, daily and hourly forecasts in one Open-Meteo request", async (t) => {
  const now = Math.floor(Date.now() / 3600000) * 3600;

  const fixture = {
    ...snapshot,
    timezone: "America/Los_Angeles",
    utc_offset_seconds: -7 * 3600,
    current: {
      ...snapshot.current,
      time: now + 900,
      temperature_2m: 12.5,
      apparent_temperature: 9,
      precipitation: 0.5,
      interval: 900,
      cloud_cover: 0,
    },
    hourly: {
      ...snapshot.hourly,
      time: [now],
      temperature_2m: [9.5],
      precipitation: [0.5],
      cloud_cover: [65],
    },
    // The provider keeps its request-time offset after clocks fall back.
    daily: { ...snapshot.daily, time: [Date.UTC(2026, 10, 2, 7) / 1000] },
  };

  const fetch = t.mock.method(globalThis, "fetch", async (url: string) => {
    const { origin, searchParams } = new URL(url);
    assert.equal(origin, "https://api.open-meteo.com");
    assert.equal(searchParams.get("timezone"), "auto");
    assert.equal(searchParams.get("forecast_days"), "7");
    assert.ok(searchParams.get("current")?.includes("temperature_2m"));
    assert.ok(searchParams.get("daily")?.includes("temperature_2m_max"));
    assert.ok(searchParams.get("hourly")?.includes("temperature_2m"));
    assert.ok(searchParams.get("current")?.includes("cloud_cover"));
    assert.ok(searchParams.get("hourly")?.includes("cloud_cover"));
    return Response.json(fixture);
  });

  const value = await forecast(
    { lat: 47.6, lon: -122.3 },
    new AbortController().signal,
  );

  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(value.source, "Open-Meteo");
  assert.equal(value.current?.t, now + 900);
  assert.equal(value.current?.c, 12.5);
  assert.equal(value.current?.feelsLikeC, 9);
  assert.equal(value.current?.precipMmPerHour, 2);
  assert.equal(value.hours[0].precipMmPerHour, 0.5);
  assert.equal(value.hours[0].c, 9.5);
  assert.equal(value.current?.cloudCover, 0);
  assert.equal(value.hours[0].cloudCover, 65);
  assert.equal(value.daily[0].date, "2026-11-02");
  assert.equal(value.daily[0].high, snapshot.daily.temperature_2m_max[0]);
});

test("missing current and daily values remain unavailable", async (t) => {
  const fixture = {
    ...snapshot,
    current: { ...snapshot.current, temperature_2m: null },
    daily: {
      ...snapshot.daily,
      temperature_2m_min: [null],
      time: snapshot.daily.time.slice(0, 1),
    },
    hourly: { ...snapshot.hourly, time: [Math.floor(Date.now() / 1000)] },
  };

  t.mock.method(globalThis, "fetch", async () => Response.json(fixture));

  const value = await forecast(
    { lat: 27.7, lon: 85.3 },
    new AbortController().signal,
  );

  assert.equal(value.current, null);
  assert.equal(value.daily[0].low, null);
  assert.equal(value.hours.length, 1);
  assert.equal(value.hours[0].cloudCover, null);
});

test("weather codes distinguish fog, snowfall intensity, and thunderstorms", () => {
  for (const code of [45, 48]) assert.equal(condition(code), "Fog");

  for (const code of [95, 96, 99])
    assert.equal(condition(code), "Thunderstorms");

  assert.deepEqual([71, 73, 75, 77, 85, 86].map(condition), [
    "Light snow",
    "Snow",
    "Heavy snow",
    "Snow grains",
    "Light snow showers",
    "Heavy snow showers",
  ]);

  assert.equal(condition(100), "Conditions unavailable");
});
