import assert from "node:assert/strict";
import { accessSync } from "node:fs";
import test from "node:test";
import { condition } from "../src/forecast/weather.ts";
import { weatherIconName } from "../src/forecast/weatherIcon.ts";

test("every forecast condition has bundled animated and reduced-motion Meteocons", () => {
  const unavailable = condition(null);

  for (let code = 0; code <= 100; code++) {
    const desc = condition(code);

    for (const day of [true, false]) {
      const icon = weatherIconName(desc, day);
      assert.equal(icon === "not-available", desc === unavailable, desc);

      for (const variant of ["animated", "static"]) {
        accessSync(
          new URL(
            `../assets/meteocons/${variant}/${icon}.svg`,
            import.meta.url,
          ),
        );
      }
    }
  }

  assert.equal(weatherIconName(condition(0), false), "clear-night");
  assert.equal(weatherIconName(condition(85), true), "partly-cloudy-day-snow");

  assert.equal(
    weatherIconName(condition(95), false),
    "thunderstorms-night-rain",
  );
});
