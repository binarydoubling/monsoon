# Monsoon Weather Atlas

Monsoon is an Electron weather explorer built with TypeScript, React DOM, and MapLibre. Drag the full-screen globe and tap a location, or search by name or decimal latitude and longitude. Forecasts appear in a desktop side panel or a mobile bottom sheet. The hourly outlook shows temperature, wind, and precipitation probability across 24 or 48 hours in the selected location’s time zone. Tap the curve or a weather illustration to inspect an hour.

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

Use `npm run typecheck` for strict TypeScript checks, `npm run format` to apply Prettier, and `npm run format:check` to verify formatting.

## Data

- [NWS](https://www.weather.gov/documentation/services-web-api) supplies hourly forecasts for supported US points. When unavailable, the app uses [Open-Meteo](https://open-meteo.com/). Its free endpoint supports non-commercial usage within its [rate limits](https://open-meteo.com/en/terms). Forecast values and derived graphics use CC BY 4.0 data.
- Place search uses the Open-Meteo geocoding API and GeoNames. Coordinates work without geocoding.
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) renders the globe in Chromium and the browser. It handles projection, desktop dragging, touch gestures, and zoom.
- [OpenFreeMap](https://openfreemap.org/) serves the street cartography at regional and street zoom levels. Map credits belong to OpenFreeMap, OpenMapTiles and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- The globe surface uses the [Solar System Scope Earth texture](https://www.solarsystemscope.com/textures/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), adapted from the three.js Earth example, reprojected to Mercator and tinted with relief shading. The texture is static.
- As you zoom, the satellite layer streams the 2025 EOxCloudless mosaic (10 m pixels where covered) by EOX IT Services GmbH, containing modified Copernicus Sentinel data. The endpoint is free for non-commercial use under [CC BY-NC-SA 4.0](https://cloudless.eox.at/license-non-commercial). At closer scales, available aerial surveys from [USGS and USDA](https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map) in the contiguous United States and [Náttúrufræðistofnun](https://www.natt.is/en/resources/open-data/aerial-photos) in Iceland add local detail. Coverage and capture dates vary. Use **Layers** to toggle the imagery, road detail, and place labels independently.
- Both relief maps ship with the app. The world overview and higher-resolution Iceland inset use [Natural Earth](https://www.naturalearthdata.com/) land outlines and [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/). See the [terrain data credits](assets/maps/ATTRIBUTION.txt).
- A dated Reykjavík forecast is bundled for initial rendering and offline inspection. Other locations show an unavailable state when the providers cannot respond. Successful live requests are cached in memory for 15 minutes. Bookmarks and unit preferences are stored on the device.

No API keys are required.
