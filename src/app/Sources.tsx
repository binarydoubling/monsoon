import { AtlasText, Button, Icon, line, sub } from "../shared/ui";

export default function Sources() {
  return (
    <div className="stack scroll">
      {[
        [
          "Open-Meteo",
          "Current conditions, hourly and daily forecasts, and place search (GeoNames). Weather data licensed CC BY 4.0. Free API for non-commercial use.",
          "https://open-meteo.com/",
        ],
        [
          "Photon",
          "Location names for selected coordinates use © OpenStreetMap contributors via komoot’s Photon service.",
          "https://photon.komoot.io/",
        ],
        [
          "Hipparcos star catalogue",
          "Star positions, brightness and colour from ESA’s Hipparcos Catalogue (1997), distributed by CDS VizieR.",
          "https://cdsarc.cds.unistra.fr/viz-bin/cat/I/239",
        ],
        [
          "Sunlight",
          "Solar position calculated from UTC using the U.S. Naval Observatory’s approximate solar coordinates.",
          "https://aa.usno.navy.mil/faq/sun_approx",
        ],
        [
          "RainViewer",
          "Observed precipitation radar and radar coverage from RainViewer. Free for personal and educational use.",
          "https://www.rainviewer.com/",
        ],
        [
          "OpenFreeMap",
          "Administrative borders and street cartography via OpenFreeMap and © OpenMapTiles, using Natural Earth and OpenStreetMap contributor data.",
          "https://openfreemap.org/",
        ],
        [
          "EOxCloudless",
          "Satellite overview and global 10 m mosaic by EOX IT Services GmbH. Contains modified Copernicus Sentinel data 2025. Overview retiled for Monsoon. CC BY-NC-SA 4.0.",
          "https://cloudless.eox.at/license-non-commercial",
        ],
        [
          "U.S. aerial imagery",
          "USDA and USGS The National Map provide local orthoimagery in the contiguous United States.",
          "https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map",
        ],
        [
          "Iceland aerial imagery",
          "Aerial photographs from Náttúrufræðistofnun, where survey coverage is available.",
          "https://www.natt.is/en/resources/open-data/aerial-photos",
        ],
        [
          "Natural Earth",
          "Public-domain coastlines, country and subdivision abbreviation points, and city labels ranked by estimated metropolitan population.",
          "https://www.naturalearthdata.com/",
        ],
        [
          "Mapzen terrain",
          "Shaded relief derived from Terrain Tiles. View elevation and bathymetry source credits.",
          "https://github.com/tilezen/joerd/blob/master/docs/attribution.md",
        ],
      ].map(([name, desc, url]) => (
        <Button
          key={name}
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          style={{
            paddingBlock: 10,
            borderTopWidth: 1,
            borderColor: line,
            gap: 12,
          }}
        >
          <div className="stack" style={{ flex: 1 }}>
            <AtlasText face="bold">{name}</AtlasText>
            <AtlasText size={13} color={sub}>
              {desc}
            </AtlasText>
          </div>
          <Icon name="external-link" size={15} />
        </Button>
      ))}
    </div>
  );
}
