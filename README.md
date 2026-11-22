# Monsoon Weather Atlas

A TypeScript and React Native point-forecast explorer for iOS, Android, and the web. Drag the full-screen globe and tap a location, or search by name or decimal latitude and longitude. Forecasts appear in a desktop side panel or a mobile bottom sheet. The hourly outlook shows temperature, wind, and precipitation probability across 24 or 48 hours in the selected location’s time zone. Tap the curve or a weather illustration to inspect an hour.

## Run locally

Install dependencies with `npm ci`. Use `npm run web` for the browser or `npm start` for the Expo development server. The native targets use Expo SDK 54. Use `npm run ios` or `npm run android` with a compatible simulator or emulator. Run `npm run build` to export the website into `dist/`.

## Development checks

Use `npm run typecheck` for strict TypeScript checks, `npm run format` to apply Prettier, and `npm run format:check` to verify formatting.

## Data

- [NWS](https://www.weather.gov/documentation/services-web-api) supplies hourly forecasts for supported US points. When unavailable, the app uses [Open-Meteo](https://open-meteo.com/). Its free endpoint supports non-commercial usage within its [rate limits](https://open-meteo.com/en/terms). Forecast values and derived graphics use CC BY 4.0 data.
- Place search uses the Open-Meteo geocoding API and GeoNames. Coordinates work without geocoding.
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) renders the globe on the web and inside an Expo DOM component on iOS and Android. It handles projection, desktop dragging, touch gestures, and zoom.
- [OpenFreeMap](https://openfreemap.org/) serves the street cartography at regional and street zoom levels. Map credits belong to OpenFreeMap, OpenMapTiles and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- The globe surface uses the [Solar System Scope Earth texture](https://www.solarsystemscope.com/textures/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), adapted from the three.js Earth example, reprojected to Mercator and tinted with relief shading. The texture is static.
- As you zoom, the satellite layer streams the 2025 EOxCloudless mosaic (10 m pixels where covered) by EOX IT Services GmbH, containing modified Copernicus Sentinel data. The endpoint is free for non-commercial use under [CC BY-NC-SA 4.0](https://cloudless.eox.at/license-non-commercial). At closer scales, available aerial surveys from [USGS and USDA](https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map) in the contiguous United States and [Náttúrufræðistofnun](https://www.natt.is/en/resources/open-data/aerial-photos) in Iceland add local detail. Coverage and capture dates vary. Use **Layers** to toggle the imagery, road detail, and place labels independently.
- Both relief maps ship with the app. The world overview and higher-resolution Iceland inset use [Natural Earth](https://www.naturalearthdata.com/) land outlines and [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/). See the [terrain data credits](assets/maps/ATTRIBUTION.txt).
- A dated Reykjavík forecast is bundled for initial rendering and offline inspection. Other locations show an unavailable state when the providers cannot respond. Successful live requests are cached in memory for 15 minutes. Bookmarks and unit preferences are stored on the device.

No API keys are required.
