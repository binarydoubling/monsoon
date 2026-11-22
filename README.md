# Monsoon Weather Atlas

Monsoon is an Electron weather explorer built with TypeScript, React DOM, and MapLibre. Drag the full-screen globe and tap a location, or search by name or decimal latitude and longitude. Forecasts appear in a desktop side panel or a mobile bottom sheet. Overview shows current conditions above seven local forecast days. Minute explorer pins the readings and chart in the panel as you scroll through the available hourly forecast in one-minute steps. Minute values are interpolated from hourly forecasts. The local clock, graph cursor, and Three.js sky follow the selected minute. Solar geometry determines the daylight, and Open-Meteo cloud cover guides the illustrated clouds. Hover or drag on the graph to jump, use the arrow keys for individual minutes, or Page Up and Page Down for an hour.

## Run locally

Use Node 22.18 or newer. From the project root:

```sh
npm ci
npm start
```

`npm start` compiles and opens the Electron app. For renderer development with live updates, use `npm run web`. The same responsive interface runs in a mobile browser.

## Package the desktop app

Run `npm run build` on macOS, Windows, or Linux to package Monsoon for the current platform and architecture under `release/`. On Apple Silicon, open `release/Monsoon-darwin-arm64/Monsoon.app`. Mac builds are signed locally for use on the build machine. The desktop app keeps bookmarks and temperature units in its Electron profile.

## Development checks

Use `npm run typecheck` for strict TypeScript checks. Run `npm run format` to apply Prettier and insert the blank lines ESLint requires around code blocks and multiline statements. Use `npm run lint` to check spacing or `npm run format:check` to check both tools.

## Data

- [Open-Meteo](https://open-meteo.com/) supplies current conditions, hourly forecasts, and daily forecasts worldwide. Its free endpoint supports non-commercial usage within its [rate limits](https://open-meteo.com/en/terms). Forecast values and derived graphics use CC BY 4.0 data.
- Place search uses the Open-Meteo geocoding API and GeoNames. Unlabeled map picks and coordinate searches resolve nearby place names through [Photon](https://github.com/komoot/photon) using [OpenStreetMap data](https://www.openstreetmap.org/copyright). The forecast always uses the selected coordinates.
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) renders the globe in Chromium and the browser. It handles projection, desktop dragging, touch gestures, and zoom.
- Sunlight, twilight and the atmospheric rim follow the device’s UTC clock. The solar position is calculated locally using the [US Naval Observatory solar ephemeris](https://aa.usno.navy.mil/faq/sun_approx). The space backdrop uses positions, visual magnitudes and colours from the [ESA Hipparcos Catalogue (1997), via CDS VizieR](https://cdsarc.cds.unistra.fr/viz-bin/cat/I/239). The bundled subset covers stars brighter than magnitude 6.7 with published coordinates.
- [OpenFreeMap](https://openfreemap.org/) serves the street cartography at regional and street zoom levels. Map credits belong to OpenFreeMap, OpenMapTiles and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- The first globe view draws bundled satellite tiles from EOxCloudless by EOX IT Services GmbH, containing modified Copernicus Sentinel data 2025. Monsoon retiled the Web Mercator mosaic into 1,024-pixel JPEGs with up to 8,192 pixels across the world. The bundled tiles are available offline under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
- Zooming streams finer tiles from the same mosaic, down to 10 m where covered. At close scales, [USDA NAIP via USGS](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer) adds aerial photography in the contiguous United States, and [Náttúrufræðistofnun](https://www.natt.is/en/resources/open-data/aerial-photos) supplies aerial imagery in Iceland. Coverage and capture dates vary. Use **Layers** to toggle imagery, road detail, and place labels independently.
- Both relief maps ship with the app. The world overview and higher-resolution Iceland inset use [Natural Earth](https://www.naturalearthdata.com/) land outlines and [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/). See the [terrain data credits](assets/maps/ATTRIBUTION.txt).
- A dated Reykjavík forecast is bundled for initial rendering and offline inspection. Other locations show an unavailable state when Open-Meteo cannot respond. Successful live requests are cached in memory for 15 minutes. Bookmarks and unit preferences are stored on the device.

No API keys are required.
