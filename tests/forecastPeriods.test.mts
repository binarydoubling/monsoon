import assert from "node:assert/strict";
import test from "node:test";
import { forecastPeriods } from "../src/forecast/overview/forecastPeriods.ts";
import type { Forecast, ForecastHour } from "../src/forecast/weather.ts";

function series(start: string, length: number, zone: string): Forecast {
  const hours = Array.from({ length }, (_, i): ForecastHour => ({
    t: Date.parse(start) / 1000 + i * 3600,
    c: i,
    hum: null,
    kmh: null,
    dir: null,
    rain: null,
    day: false,
    desc: "Overcast",
  }));

  return { source: "Open-Meteo", current: hours[0], daily: [], hours, zone };
}

test("night stays with the preceding evening across both DST transitions", () => {
  for (const [start, date, length] of [
    ["2026-10-31T22:00:00Z", "2026-10-31", 13],
    ["2026-03-07T23:00:00Z", "2026-03-07", 11],
  ] as const) {
    const forecast = series(start, length + 1, "America/New_York");
    const [evening, next] = forecastPeriods(forecast);

    assert.equal(evening.date, date);

    assert.deepEqual(
      evening.periods.map((p) => p.name),
      ["Night"],
    );

    assert.deepEqual(evening.periods[0].hours, forecast.hours.slice(0, length));
    assert.deepEqual(next.periods[0].hours, [forecast.hours[length]]);
  }
});

test("a pre-dawn selection keeps the remaining overnight hours on the local date", () => {
  const forecast = series("2026-11-22T18:15:00Z", 25, "Asia/Kathmandu");
  const reference = forecast.hours[4].t + 1800;
  const [day] = forecastPeriods(forecast, reference);

  assert.equal(day.date, "2026-11-23");

  assert.deepEqual(
    day.periods.map((p) => p.name),
    ["Overnight", "Day", "Night"],
  );

  assert.deepEqual(day.periods[0].hours, forecast.hours.slice(4, 6));
  assert.deepEqual(day.periods[1].hours, forecast.hours.slice(6, 18));
  assert.deepEqual(day.periods[2].hours, forecast.hours.slice(18));
});

test("a daily aggregate with no hourly coverage keeps the date without inventing periods' weather", () => {
  const forecast = series("2026-04-01T10:00Z", 0, "UTC");

  forecast.daily = [
    { date: "2026-04-01", desc: "Rain", high: 12, low: 0, rain: 70 },
  ];

  const [day] = forecastPeriods(
    forecast,
    Date.parse("2026-04-01T10:00Z") / 1000,
  );

  assert.equal(day.daily?.high, 12);

  assert.deepEqual(day.periods, [
    { name: "Day", hours: [] },
    { name: "Night", hours: [] },
  ]);
});
