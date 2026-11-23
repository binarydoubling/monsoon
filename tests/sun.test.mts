import assert from "node:assert/strict";
import test from "node:test";
import {
  daylightIntervals,
  solarElevation,
  solarPosition,
} from "../src/shared/sun.ts";

// USNO Celestial Navigation almanac: observer longitude/latitude, solar GHA,
// declination and computed altitude in degrees. East longitude is positive.
const observations = [
  {
    utc: "2024-03-20T12:00:00Z",
    lon: 0,
    lat: 0,
    gha: 358.172689,
    dec: 0.146548,
    altitude: 88.166823,
  },
  {
    utc: "2024-03-20T00:00:00Z",
    lon: 179,
    lat: 0,
    gha: 178.135589,
    dec: -0.051019,
    altitude: 87.135136,
  },
  {
    utc: "2024-06-20T23:00:00Z",
    lon: 15.65,
    lat: 78.22,
    gha: 164.54873,
    dec: 23.438196,
    altitude: 11.658262,
  },
  {
    utc: "2024-12-21T12:00:00Z",
    lon: 15.65,
    lat: -78.22,
    gha: 0.427155,
    dec: -23.438352,
    altitude: 34.706186,
  },
];

for (const observation of observations) {
  test(`solar coordinates agree with the almanac at ${observation.utc}`, () => {
    const sun = solarPosition(Date.parse(observation.utc));
    const longitudeError = ((sun.lon + observation.gha + 540) % 360) - 180;
    assert.ok(Math.abs(longitudeError) < 0.02);
    assert.ok(Math.abs(sun.lat - observation.dec) < 0.02);

    assert.ok(
      Math.abs(
        solarElevation(sun, observation.lon, observation.lat) -
          observation.altitude,
      ) < 0.02,
    );
  });
}

test("daylight bands follow local sunrise and sunset across the chart edges", () => {
  const start = Date.parse("2024-03-20T12:00:00Z") / 1000;
  const bands = daylightIntervals(start, 1440, 0, 0);
  assert.equal(bands.length, 2);
  assert.equal(bands[0].from, 0);
  assert.ok(Math.abs(bands[0].to - 371) < 3);
  assert.ok(Math.abs(bands[1].from - 1084) < 3);
  assert.equal(bands[1].to, 1440);
  assert.equal(daylightIntervals(start, 1440, 180, 0).length, 1);
});

test("polar daylight spans the full plot and polar night leaves it dark", () => {
  const start = Date.parse("2024-06-21T00:00:00Z") / 1000;

  assert.deepEqual(daylightIntervals(start, 2880, 15, 78), [
    { from: 0, to: 2880 },
  ]);

  assert.deepEqual(daylightIntervals(start, 2880, 15, -78), []);
});
