import { Asset } from "expo-asset";
import type { StyleSpecification, LayerSpecification } from "maplibre-gl";

const uri = (image: number) => Asset.fromModule(image).uri;
const lat = (y: number) =>
  (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
const icelandWest = -30.9375,
  icelandEast = -8.4375;
const lines: number[][][] = [];
for (let lng = -180; lng < 180; lng += 15)
  lines.push(Array.from({ length: 89 }, (_, i) => [lng, i * 2 - 88]));
for (let lat = -75; lat <= 75; lat += 15)
  lines.push(Array.from({ length: 181 }, (_, i) => [i * 2 - 180, lat]));
export const providerURL = "https://tiles.openfreemap.org/styles/liberty";
// WMTS paths use matrix/row/column (zoom/y/x).
export const imageryLayers = [
  "sentinel-2",
  "us-ortho",
  "iceland-ortho",
] as const;
const imagery: LayerSpecification[] = imageryLayers.map((id) => ({
  id,
  type: "raster",
  source: id,
  minzoom: id === "sentinel-2" ? 2.8 : 12,
  paint: { "raster-fade-duration": 220 },
}));
export function atlasStyle(detail?: StyleSpecification): StyleSpecification {
  const base: LayerSpecification[] = [
    {
      id: "relief",
      type: "raster",
      source: "relief",
      paint: { "raster-fade-duration": 0 },
    },
    {
      id: "iceland-relief",
      type: "raster",
      source: "iceland",
      minzoom: 4,
      paint: { "raster-fade-duration": 0 },
    },
    {
      id: "earth-surface",
      type: "raster",
      source: "earth",
      maxzoom: 5,
      paint: {
        "raster-fade-duration": 0,
        "raster-opacity": ["interpolate", ["linear"], ["zoom"], 3.5, 1, 5, 0],
      },
    },
  ];
  const streets = (detail?.layers ?? []).map((layer) => ({
    ...layer,
    minzoom: Math.max(layer.minzoom ?? 0, 5.8),
  }));
  const overlay = (layer: LayerSpecification) =>
    layer.type === "symbol" ||
    (layer.type === "line" &&
      ["boundary", "transportation"].includes(layer["source-layer"] ?? ""));
  return {
    version: 8,
    projection: { type: "globe" },
    sky: {
      "atmosphere-blend": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.85,
        4,
        0.5,
        6,
        0,
      ],
      "sky-color": "#1d4550",
      "horizon-color": "#a9d7d0",
      "fog-color": "#abc5c2",
      "fog-ground-blend": 0,
      "horizon-fog-blend": 0,
      "sky-horizon-blend": 0.3,
    },
    ...(detail ? { glyphs: detail.glyphs, sprite: detail.sprite } : {}),
    sources: {
      ...detail?.sources,
      "sentinel-2": {
        type: "raster",
        tiles: [
          "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg",
        ],
        tileSize: 256,
        maxzoom: 14,
        attribution:
          '<a href="https://cloudless.eox.at">EOxCloudless</a> by <a href="https://eox.at">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2025) · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>',
      },
      "us-ortho": {
        type: "raster",
        tiles: [
          "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}?blankTile=false",
        ],
        bounds: [-125, 24.4, -66.9, 49.4],
        tileSize: 256,
        minzoom: 12,
        maxzoom: 17,
        attribution:
          'USDA · <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>',
      },
      "iceland-ortho": {
        type: "raster",
        tiles: [
          "https://gis.natt.is/mapcache/web-mercator/wms?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=grunnkort-loftmynd&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE",
        ],
        bounds: [-24.1, 63.25, -13.18, 66.7],
        tileSize: 256,
        minzoom: 12,
        maxzoom: 19,
        attribution:
          '<a href="https://www.natt.is/en/resources/open-data/aerial-photos">Náttúrufræðistofnun · Iceland aerial imagery</a>',
      },
      earth: {
        type: "raster",
        tiles: [uri(require("../assets/maps/earth.jpg"))],
        maxzoom: 0,
        tileSize: 512,
        attribution:
          'Imagery © <a href="https://www.solarsystemscope.com/textures/">Solar System Scope</a> (CC BY 4.0)',
      },
      relief: {
        type: "raster",
        tiles: [uri(require("../assets/maps/world.jpg"))],
        maxzoom: 0,
        tileSize: 512,
        attribution: "Natural Earth · Mapzen",
      },
      iceland: {
        type: "image",
        url: uri(require("../assets/maps/iceland.jpg")),
        coordinates: [
          [icelandWest, lat(0.234375)],
          [icelandEast, lat(0.234375)],
          [icelandEast, lat(0.28125)],
          [icelandWest, lat(0.28125)],
        ],
      },
      grid: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "MultiLineString", coordinates: lines },
        },
      },
    },
    layers: [
      ...base,
      ...streets.filter((layer) => !overlay(layer)),
      ...imagery,
      ...streets.filter(overlay),
      {
        id: "meridians",
        type: "line",
        source: "grid",
        maxzoom: 5.5,
        paint: {
          "line-color": "#e7eed9",
          "line-opacity": 0.27,
          "line-width": 0.7,
        },
      },
    ],
  };
}
