import assert from "node:assert/strict";
import test from "node:test";
import { solarElevation, solarPosition } from "../src/sun.ts";

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
