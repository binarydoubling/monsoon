import type {
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";
import { localPlaceZoom, placeLabels } from "./placeLabels";
import { atmospherePosition, solarPosition } from "../shared/sun";

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

const sentinelCredit =
  '<a href="https://cloudless.eox.at">EOxCloudless</a> by <a href="https://eox.at">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2025) · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>';

const imageryMinZoom = {
  "satellite-overview": 0,
  "sentinel-2": 0,
  "us-ortho": 10,
  "us-naip": 15,
  "iceland-ortho": 10,
};

export const imageryLayers = Object.keys(imageryMinZoom);

const imagery: LayerSpecification[] = Object.entries(imageryMinZoom).map(
  ([id, minzoom]) => ({
    id,
    minzoom,
    type: "raster",
    source: id,
    paint: { "raster-fade-duration": 0 },
  }),
);

const boundaryLine = {
  type: "line",
  source: "openmaptiles",
  "source-layer": "boundary",
} as const;

const landBorder: FilterSpecification = [
  "all",
  ["==", ["geometry-type"], "LineString"],
  ["!=", ["get", "maritime"], 1],
  ["!", ["has", "claimed_by"]],
];

const countryBorder: FilterSpecification = [
  "all",
  landBorder,
  ["==", ["get", "admin_level"], 2],
  ["!=", ["get", "disputed"], 1],
];

export const borderLayers: LayerSpecification[] = [
  {
    ...boundaryLine,
    id: "state-province-borders",
    minzoom: 2,
    filter: [
      "all",
      landBorder,
      ["in", ["get", "admin_level"], ["literal", [3, 4]]],
      ["!=", ["get", "disputed"], 1],
    ],
    paint: {
      "line-color": "#cdd6f4",
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0.36, 5, 0.82],
      "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.75, 8, 1.45],
      "line-dasharray": [4, 2],
    },
  },
  {
    ...boundaryLine,
    id: "country-border-casing",
    filter: countryBorder,
    paint: {
      "line-color": "#11111b",
      "line-opacity": 0.65,
      "line-width": ["interpolate", ["linear"], ["zoom"], 0, 1.55, 8, 3.25],
    },
  },
  {
    ...boundaryLine,
    id: "country-borders",
    filter: countryBorder,
    paint: {
      "line-color": "#efe9df",
      "line-opacity": 0.88,
      "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.7, 8, 1.65],
    },
  },
  {
    ...boundaryLine,
    id: "disputed-borders",
    filter: [
      "all",
      ["==", ["geometry-type"], "LineString"],
      ["!=", ["get", "maritime"], 1],
      ["==", ["get", "disputed"], 1],
      ["in", ["get", "admin_level"], ["literal", [2, 3, 4]]],
    ],
    paint: {
      "line-color": "#f5e0dc",
      "line-opacity": 0.85,
      "line-dasharray": [2, 3],
      "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 8, 1.6],
    },
  },
];

export function atlasStyle(
  pixelRatio: number,
  detail?: StyleSpecification,
): StyleSpecification {
  // MapLibre sizes raster tiles in CSS pixels. Request finer tiles for dense screens.
  const density = Math.min(2, Math.max(1, pixelRatio));

  const base: LayerSpecification[] = [
    {
      id: "relief",
      type: "raster",
      source: "relief",
      layout: { visibility: "none" },
      paint: { "raster-fade-duration": 0 },
    },
    {
      id: "iceland-relief",
      type: "raster",
      source: "iceland",
      minzoom: 4,
      layout: { visibility: "none" },
      paint: { "raster-fade-duration": 0 },
    },
  ];

  const streets = (detail?.layers ?? [])
    .filter(
      (layer) =>
        !(layer.type === "line" && layer["source-layer"] === "boundary") &&
        !(
          layer.type === "symbol" &&
          layer["source-layer"] === "place" &&
          (layer.id.startsWith("label_country_") || layer.id === "label_state")
        ),
    )
    .map((layer) => ({
      ...layer,
      minzoom: Math.max(
        layer.minzoom ?? 0,
        layer.type === "symbol" && layer["source-layer"] === "place"
          ? localPlaceZoom
          : 5.8,
      ),
    }));

  const overlay = (layer: LayerSpecification) =>
    layer.type === "symbol" ||
    (layer.type === "line" && layer["source-layer"] === "transportation");

  return {
    version: 8,
    projection: { type: "globe" },
    light: {
      anchor: "map",
      position: atmospherePosition(solarPosition(Date.now())),
      "position-transition": { duration: 0 },
    },
    sky: {
      "atmosphere-blend": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.55,
        4,
        0.32,
        6,
        0,
      ],
      "sky-color": "#000000",
      "horizon-color": "#05080d",
      "fog-color": "#090c11",
      "fog-ground-blend": 0,
      "horizon-fog-blend": 0,
      "sky-horizon-blend": 0.3,
    },
    ...(detail ? { glyphs: detail.glyphs, sprite: detail.sprite } : {}),
    sources: {
      openmaptiles: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      },
      ...detail?.sources,
      "atlas-places": {
        type: "geojson",
        data: "/maps/place-labels.geojson",
        attribution:
          '<a href="https://www.naturalearthdata.com/">Natural Earth</a>',
      },
      sunlight: {
        type: "raster",
        tiles: ["monsoon-sunlight://earth/{z}/{x}/{y}"],
        tileSize: 512,
        maxzoom: 0,
      },
      "satellite-overview": {
        type: "raster",
        tiles: ["/maps/sentinel-2025/{z}/{x}/{y}.jpg"],
        tileSize: 512 / density,
        maxzoom: 3,
        attribution: sentinelCredit,
      },
      "sentinel-2": {
        type: "raster",
        tiles: [
          "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg",
        ],
        tileSize: 256 / density,
        // The bundled 1024 px tiles at z3 already contain WMTS z5 detail.
        minzoom: 6,
        maxzoom: 14,
        attribution: sentinelCredit,
      },
      "us-ortho": {
        type: "raster",
        tiles: [
          "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}?blankTile=false",
        ],
        bounds: [-125, 24.4, -66.9, 49.4],
        tileSize: 256 / density,
        minzoom: 12,
        maxzoom: 16,
        attribution:
          'USDA · <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>',
      },
      "us-naip": {
        type: "raster",
        tiles: [
          "https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=512,512&format=png32&f=image",
        ],
        bounds: [-125, 24.4, -66.9, 49.4],
        tileSize: 512 / density,
        minzoom: 16,
        maxzoom: 18,
        attribution:
          '<a href="https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer">USDA NAIP · USGS</a>',
      },
      "iceland-ortho": {
        type: "raster",
        tiles: [
          "https://gis.natt.is/mapcache/web-mercator/wms?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=grunnkort-loftmynd&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE",
        ],
        bounds: [-24.1, 63.25, -13.18, 66.7],
        tileSize: 256 / density,
        minzoom: 12,
        maxzoom: 19,
        attribution:
          '<a href="https://www.natt.is/en/resources/open-data/aerial-photos">Náttúrufræðistofnun · Iceland aerial imagery</a>',
      },
      relief: {
        type: "raster",
        tiles: [new URL("../../assets/maps/world.jpg", import.meta.url).href],
        maxzoom: 0,
        tileSize: 512,
        attribution: "Natural Earth · Mapzen",
      },
      iceland: {
        type: "image",
        url: new URL("../../assets/maps/iceland.jpg", import.meta.url).href,
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
      {
        id: "sunlight",
        type: "raster",
        source: "sunlight",
        paint: {
          "raster-fade-duration": 0,
          "raster-opacity": 1,
          "raster-opacity-transition": { duration: 0 },
        },
      },
      ...borderLayers,
      ...streets.filter(overlay),
      ...placeLabels.map((layer) =>
        detail && layer.id === "population-city-labels"
          ? { ...layer, maxzoom: localPlaceZoom }
          : layer,
      ),
      {
        id: "meridians",
        type: "line",
        source: "grid",
        maxzoom: 5.5,
        layout: { visibility: "none" },
        paint: {
          "line-color": "#b4befe",
          "line-opacity": 0.27,
          "line-width": 0.7,
        },
      },
    ],
  };
}
