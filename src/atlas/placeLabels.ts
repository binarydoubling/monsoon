import type { SymbolLayerSpecification } from "maplibre-gl";

// At street scale, OpenFreeMap provides detailed settlement and neighborhood labels.
export const localPlaceZoom = 8;

const source = "atlas-places";
const halo = { "text-halo-color": "#11111b", "text-halo-width": 1.35 };

export const placeLabels: SymbolLayerSpecification[] = [
  {
    id: "region-initials",
    type: "symbol",
    source,
    filter: [
      "all",
      ["==", ["get", "kind"], "region"],
      [">=", ["zoom"], ["get", "start"]],
    ],
    layout: {
      "text-field": ["get", "code"],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 0, 10, 5, 12],
      "text-letter-spacing": 0.08,
      "text-padding": 5,
      "symbol-sort-key": ["get", "rank"],
    },
    paint: { ...halo, "text-color": "#c8d0eb" },
  },
  {
    id: "population-city-labels",
    type: "symbol",
    source,
    filter: [
      "all",
      ["==", ["get", "kind"], "city"],
      [
        ">=",
        ["get", "population"],
        [
          "step",
          ["zoom"],
          8000000,
          1,
          4000000,
          2,
          2000000,
          3,
          750000,
          4,
          250000,
          5,
          75000,
          6,
          20000,
          7,
          5000,
          localPlaceZoom,
          0,
        ],
      ],
    ],
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 0, 10, 6, 13],
      "text-padding": 4,
      "text-max-width": 11,
      "symbol-sort-key": ["-", 0, ["get", "population"]],
    },
    paint: { ...halo, "text-color": "#faf4e6" },
  },
  {
    id: "country-initials",
    type: "symbol",
    source,
    filter: [
      "all",
      ["==", ["get", "kind"], "country"],
      [">=", ["zoom"], ["get", "start"]],
    ],
    layout: {
      "text-field": ["get", "code"],
      "text-font": ["Noto Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 0, 12, 5, 16],
      "text-letter-spacing": 0.12,
      "text-padding": 5,
      "symbol-sort-key": ["get", "rank"],
    },
    paint: { ...halo, "text-color": "#e8d6f7" },
  },
];
