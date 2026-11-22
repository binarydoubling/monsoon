// Earth-fixed solar coordinates, from the US Naval Observatory's approximate solar ephemeris.
export const radians = Math.PI / 180;
const j2000 = Date.UTC(2000, 0, 1, 12);

export function solarPosition(utc: number) {
  const days = (utc - j2000) / 86400000;
  const anomaly = (357.529 + 0.98560028 * days) * radians;

  const longitude =
    (280.459 +
      0.98564736 * days +
      1.915 * Math.sin(anomaly) +
      0.02 * Math.sin(2 * anomaly)) *
    radians;

  const obliquity = (23.439 - 0.00000036 * days) * radians;

  const rightAscension =
    Math.atan2(Math.cos(obliquity) * Math.sin(longitude), Math.cos(longitude)) /
    radians;

  const declination =
    Math.asin(Math.sin(obliquity) * Math.sin(longitude)) / radians;

  const sidereal = (280.460625 + 360.9856473663 * days) % 360;
  const subsolarLon = ((((rightAscension - sidereal) % 360) + 540) % 360) - 180;
  return { lon: subsolarLon, lat: declination, sidereal, rightAscension };
}

export type Sun = ReturnType<typeof solarPosition>;

export function solarElevation(sun: Sun, lon: number, lat: number) {
  const sine =
    Math.sin(lat * radians) * Math.sin(sun.lat * radians) +
    Math.cos(lat * radians) *
      Math.cos(sun.lat * radians) *
      Math.cos((lon - sun.lon) * radians);

  return Math.asin(Math.min(1, Math.max(-1, sine))) / radians;
}

// MapLibre's atmosphere takes the incoming light direction in spherical scene coordinates.
export function atmospherePosition(sun: Sun): [number, number, number] {
  const latitude = sun.lat * radians;
  const longitude = sun.lon * radians;
  const x = Math.cos(latitude) * Math.sin(longitude);
  const y = Math.sin(latitude);
  const z = Math.cos(latitude) * Math.cos(longitude);

  return [
    1,
    (Math.atan2(-y, -x) / radians + 270) % 360,
    Math.acos(-z) / radians,
  ];
}

// A single transparent Mercator tile shades every basemap without resampling its imagery.
export function sunlightTile(sun: Sun) {
  const size = 512;
  const pixels = new ImageData(size, size);
  const sunNorth = Math.sin(sun.lat * radians);
  const sunEquator = Math.cos(sun.lat * radians);

  const hourAngles = Float64Array.from({ length: size }, (_, x) =>
    Math.cos((((x + 0.5) * 360) / size - 180 - sun.lon) * radians),
  );

  for (let y = 0; y < size; y++) {
    const mercatorY = Math.PI * (1 - (2 * (y + 0.5)) / size);
    const north = sunNorth * Math.tanh(mercatorY);
    const equator = sunEquator / Math.cosh(mercatorY);

    for (let x = 0; x < size; x++) {
      const incidence = north + equator * hourAngles[x];
      // Diffuse daylight follows the angle of incidence. Skylight persists through twilight.
      const twilight = Math.min(1, Math.max(0, (incidence + 0.208) / 0.26));
      const skylight = twilight * twilight * (3 - 2 * twilight);

      const light =
        0.07 + 0.21 * skylight + 0.72 * Math.sqrt(Math.max(0, incidence));

      const i = 4 * (y * size + x);
      pixels.data[i] = 2;
      pixels.data[i + 1] = 4;
      pixels.data[i + 2] = 9;
      pixels.data[i + 3] = 255 * (1 - light);
    }
  }

  return createImageBitmap(pixels, { premultiplyAlpha: "premultiply" });
}
