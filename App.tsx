import React, { useState, useEffect, useRef } from "react";
import Atlas from "./src/Atlas";
import Outlook from "./src/Outlook";
import DailyForecast from "./src/DailyForecast";
import {
  AtlasText,
  Button,
  Icon,
  Logo,
  Label,
  row,
  box,
  ink,
  sub,
  line,
  accent,
  paper,
  card,
} from "./src/ui";
import {
  home,
  places,
  seed,
  key,
  coords,
  forecast,
  temp,
  getJSON,
  coordinatePlace,
  reverseGeocode,
} from "./src/weather";
import type { Forecast, Place } from "./src/weather";

interface SearchResponse {
  results?: {
    name: string;
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
  }[];
}

export default function App() {
  const [viewport, setViewport] = useState(() => ({
    width: innerWidth,
    height: innerHeight,
  }));

  useEffect(() => {
    const resize = () =>
      setViewport({ width: innerWidth, height: innerHeight });

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const { width, height } = viewport;
  const small = width < 760;
  const dialog = useRef<HTMLDialogElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [panelView, setPanelView] = useState<"overview" | "minutes">(
    "overview",
  );

  const panelWidth = Math.min(548, Math.round(width * 0.46));

  const [point, setPoint] = useState(home),
    [data, setForecast] = useState<Forecast | null>(seed),
    [state, setStatus] = useState<"loading" | "live" | "offline">("loading"),
    [unit, setFahrenheit] = useState(false),
    [saved, setSaved] = useState<Place[]>([]),
    [focus, setFocus] = useState(0),
    [retry, setRetry] = useState(0),
    [modal, setModal] = useState<"" | "saved" | "search" | "sources">(""),
    [query, setQuery] = useState(""),
    [results, setResults] = useState(places),
    [searchState, setSearchStatus] = useState(""),
    [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const savedPoints = localStorage.getItem("monsoon:saved");

      if (savedPoints)
        setSaved(
          (JSON.parse(savedPoints) as Place[]).map((p) =>
            p.name === "Dropped pin" ? coordinatePlace(p) : p,
          ),
        );

      setFahrenheit(localStorage.getItem("monsoon:unit") === "F");
    } catch {
      /* Storage can be unavailable in private browser sessions. */
    }

    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    try {
      localStorage.setItem("monsoon:saved", JSON.stringify(saved));
      localStorage.setItem("monsoon:unit", unit ? "F" : "C");
    } catch {
      /* Preferences still work for this session. */
    }
  }, [saved, unit, storageReady]);

  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);

  const { lat, lon } = point;
  const forecastPoint = useRef(key(home));

  useEffect(() => {
    const ctrl = new AbortController();
    const location = { lat, lon };
    setStatus("loading");

    if (forecastPoint.current !== key(location)) {
      forecastPoint.current = key(location);
      setForecast(key(location) === key(home) ? seed : null);
    }

    forecast(location, ctrl.signal)
      .then((v) => {
        if (!ctrl.signal.aborted) {
          setForecast(v);
          setStatus("live");
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus("offline");
      });

    return () => ctrl.abort();
  }, [lat, lon, retry]);

  useEffect(() => {
    if (!point.resolveName) return;
    const ctrl = new AbortController();

    reverseGeocode(point, ctrl.signal)
      .then((label) => {
        if (!label || ctrl.signal.aborted) return;
        const resolved = { lat: point.lat, lon: point.lon, ...label };
        setPoint((current) => (current === point ? resolved : current));

        setSaved((items) =>
          items.map((p) =>
            p.resolveName && key(p) === key(point)
              ? { lat: p.lat, lon: p.lon, ...label }
              : p,
          ),
        );
      })
      .catch(() => {
        // Coordinates still identify this forecast when the lookup is unavailable.
      });

    return () => ctrl.abort();
  }, [point]);

  useEffect(() => {
    if (modal !== "search") return;

    const text = query.trim(),
      ctrl = new AbortController();

    const cached = places.filter((p) =>
      (p.name + " " + p.region).toLowerCase().includes(text.toLowerCase()),
    );

    setResults(cached);
    setSearchStatus("");
    if (!text) return;

    const coord = text.match(
      /^\s*([+-]?\d+(?:\.\d+)?)\s*[, ]\s*([+-]?\d+(?:\.\d+)?)\s*$/,
    );

    if (coord) {
      const lat = Number(coord[1]),
        lon = Number(coord[2]);

      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180)
        setResults([coordinatePlace({ lat, lon })]);
      else
        setSearchStatus(
          "Latitude must be within ±90° and longitude within ±180°.",
        );

      return;
    }

    if (text.length < 2) return;
    setSearchStatus("Searching…");

    const timer = setTimeout(async () => {
      try {
        const v = await getJSON<SearchResponse>(
          "https://geocoding-api.open-meteo.com/v1/search?count=8&language=en&name=" +
            encodeURIComponent(text),
          ctrl.signal,
        );

        if (ctrl.signal.aborted) return;

        const rows = (v.results || []).map((p) => ({
          name: p.name,
          region: [p.admin1, p.country].filter(Boolean).join(", "),
          lat: p.latitude,
          lon: p.longitude,
        }));

        setResults(rows.length ? rows : cached);

        setSearchStatus(
          rows.length || cached.length
            ? ""
            : "No places found. Try coordinates.",
        );
      } catch {
        if (!ctrl.signal.aborted)
          setSearchStatus(
            "Place search is offline. You can still enter coordinates.",
          );
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [modal, query]);

  const selected = saved.some((p) => key(p) === key(point)),
    toggle = () =>
      setSaved((s) =>
        s.some((p) => key(p) === key(point))
          ? s.filter((p) => key(p) !== key(point))
          : [point, ...s],
      );

  function choose(p: Place, center = true) {
    setPoint(p);
    setPanelView("overview");
    setSheetOpen(true);
    if (center) setFocus((v) => v + 1);
    setModal("");
  }

  function openSearch() {
    setQuery("");
    setModal("search");
  }

  useEffect(() => {
    const timer = setInterval(() => setRetry((n) => n + 1), 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const current = data?.current;
  const referenceTime = current?.t ?? Date.now() / 1000;

  const firstHour =
    data?.hours.find((hour) => hour.t + 3600 > referenceTime) ?? data?.hours[0];

  const showMinutes = panelView === "minutes" && !!data && !!firstHour;

  return (
    <main className="stack app">
      <div className="stack" style={{ flex: 1, overflow: "hidden" }}>
        <div className="stack" style={{ position: "absolute", inset: 0 }}>
          <Atlas
            point={point}
            focus={focus}
            sidebar={small ? 0 : panelWidth + 32}
            onPick={(lat, lon, name) => {
              choose(
                name === point.name &&
                  Math.abs(lat - point.lat) < 0.0001 &&
                  Math.abs(lon - point.lon) < 0.0001
                  ? point
                  : name
                    ? {
                        lat,
                        lon,
                        name,
                        region: "Selected coordinates",
                      }
                    : coordinatePlace({ lat, lon }),
                false,
              );
            }}
          />
        </div>
        <div
          className="stack"
          style={{
            ...row,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: small ? 57 : 66,
            paddingInline: small ? 12 : 23,
            backgroundColor: "var(--crust)",
            borderBottomColor: line,
            borderBottomWidth: 1,
            gap: small ? 9 : 18,
          }}
        >
          <Button label="Monsoon home" onClick={() => choose(home)}>
            <Logo />
            <AtlasText
              face="display"
              size={small ? 22 : 28}
              color={ink}
              style={{ letterSpacing: -1 }}
            >
              Monsoon
            </AtlasText>
          </Button>
          {!small && (
            <div
              className="stack"
              style={{
                paddingLeft: 15,
                borderLeftWidth: 1,
                borderColor: line,
              }}
            >
              <Label color={sub}>WEATHER ATLAS</Label>
            </div>
          )}
          <div className="stack" style={{ flex: 1 }} />
          <Button
            onClick={openSearch}
            label="Search places or coordinates"
            style={{
              height: 35,
              paddingInline: 9,
              borderWidth: small ? 0 : 1,
              borderColor: line,
              borderRadius: 5,
            }}
          >
            <Icon name="search" size={17} color={ink} />
            {!small && (
              <AtlasText size={13} color={ink}>
                Search places or coordinates
              </AtlasText>
            )}
          </Button>
          <Button
            label="Saved points"
            onClick={() => setModal("saved")}
            style={{ padding: 4 }}
          >
            <Icon name="bookmark" size={17} color={ink} />
            {!small && (
              <AtlasText size={13} color={ink}>
                Saved points
              </AtlasText>
            )}
          </Button>
          <div
            className="stack"
            style={{
              ...row,
              borderWidth: 1,
              borderColor: line,
              borderRadius: 5,
              padding: 2,
            }}
          >
            {[false, true].map((f) => (
              <Button
                key={String(f)}
                label={f ? "Use Fahrenheit" : "Use Celsius"}
                aria-pressed={f === unit}
                onClick={() => setFahrenheit(f)}
                style={{
                  paddingInline: small ? 5 : 8,
                  paddingBlock: 4,
                  borderRadius: 3,
                  backgroundColor: f === unit ? accent : "transparent",
                }}
              >
                <AtlasText
                  face="mono"
                  size={11}
                  color={f === unit ? paper : sub}
                >
                  {f ? "°F" : "°C"}
                </AtlasText>
              </Button>
            ))}
          </div>
        </div>
        {(!small || sheetOpen) && (
          <div
            className="stack"
            aria-label="Forecast panel"
            style={{
              ...box,
              position: "absolute",
              overflow: "hidden",
              backgroundColor: paper,
              ...(small
                ? {
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: height * (showMinutes ? 0.88 : 0.76),
                    borderTopLeftRadius: 17,
                    borderTopRightRadius: 17,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  }
                : { right: 16, top: 82, bottom: 20, width: panelWidth }),
            }}
          >
            {small && (
              <Button
                label="Collapse forecast"
                style={{ paddingBlock: 7 }}
                onClick={() => setSheetOpen(false)}
              >
                <div
                  className="stack"
                  style={{
                    height: 4,
                    width: 33,
                    borderRadius: 3,
                    backgroundColor: line,
                  }}
                />
              </Button>
            )}
            <nav className="forecast-views" aria-label="Forecast views">
              <button
                type="button"
                aria-pressed={!showMinutes}
                onClick={() => setPanelView("overview")}
              >
                Overview
              </button>
              <button
                type="button"
                aria-pressed={showMinutes}
                disabled={!firstHour}
                onClick={() => setPanelView("minutes")}
              >
                Minute explorer
              </button>
            </nav>
            {showMinutes && (
              <Outlook
                key={key(point) + ":" + firstHour.t}
                hours={data.hours}
                start={firstHour.t}
                initialMinute={Math.max(
                  0,
                  Math.min(59, Math.floor((referenceTime - firstHour.t) / 60)),
                )}
                zone={data.zone}
                f={unit}
                point={point}
                saved={data === seed || state === "offline"}
              />
            )}
            <div
              className="stack scroll"
              key={key(point)}
              style={{
                paddingBottom: 12,
                display: showMinutes ? "none" : undefined,
              }}
            >
              <div
                className="stack"
                style={{
                  paddingInline: 20,
                  paddingBlock: small ? 10 : 18,
                  gap: 10,
                  backgroundColor: card,
                }}
              >
                <div
                  className="stack"
                  style={{ ...row, justifyContent: "space-between" }}
                >
                  <div className="stack" style={{ ...row, gap: 7 }}>
                    <Icon name="map-pin" size={13} color={accent} />
                    <Label color={accent}>POINT FORECAST</Label>
                  </div>
                  <div className="stack" style={{ ...row, gap: 7 }}>
                    <Button
                      onClick={toggle}
                      label={selected ? "Remove saved point" : "Save point"}
                      aria-pressed={selected}
                      style={{
                        padding: 5,
                        backgroundColor: selected ? "var(--surface0)" : paper,
                        borderRadius: 4,
                      }}
                    >
                      <Icon
                        name={selected ? "check" : "bookmark"}
                        size={16}
                        color={selected ? accent : sub}
                      />
                    </Button>
                    {small && (
                      <Button
                        label="Close forecast"
                        onClick={() => setSheetOpen(false)}
                        style={{ padding: 7 }}
                      >
                        <Icon name="x" size={18} />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="stack">
                  <AtlasText
                    face="display"
                    size={small ? 34 : 38}
                    style={{ letterSpacing: -0.6 }}
                  >
                    {point.name}
                  </AtlasText>
                  <AtlasText color={sub} size={17}>
                    {point.region}
                  </AtlasText>
                  {!point.resolveName && (
                    <AtlasText
                      face="mono"
                      color={sub}
                      size={13}
                      style={{ marginTop: 6, letterSpacing: 0.5 }}
                    >
                      {coords(point)}
                    </AtlasText>
                  )}
                </div>
                {!data && (
                  <div className="stack" style={{ paddingBlock: 26 }}>
                    {state === "loading" ? (
                      <span
                        className="spinner"
                        role="status"
                        aria-label="Loading forecast"
                      />
                    ) : (
                      <AtlasText>
                        Forecast unavailable for this point.
                      </AtlasText>
                    )}
                  </div>
                )}
                <div
                  className="stack"
                  style={{ ...row, gap: 6, marginTop: 6, flexWrap: "wrap" }}
                >
                  <div
                    className="stack"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        state === "live" ? "var(--green)" : "var(--peach)",
                    }}
                  />
                  <AtlasText size={13} color={sub}>
                    {data?.source || "Point forecast"}
                    {data === seed
                      ? " · saved forecast"
                      : state === "offline"
                        ? data
                          ? " · saved forecast"
                          : " · offline"
                        : state === "loading"
                          ? " · updating"
                          : ""}
                  </AtlasText>
                  {state === "offline" && (
                    <Button onClick={() => setRetry((v) => v + 1)}>
                      <AtlasText size={14} color={accent}>
                        Retry
                      </AtlasText>
                    </Button>
                  )}
                </div>
              </div>
              {data && (
                <DailyForecast
                  point={point}
                  forecast={data}
                  fahrenheit={unit}
                  saved={data === seed || state === "offline"}
                />
              )}
              <Button
                onClick={() => setModal("sources")}
                style={{ paddingBlock: 8 }}
              >
                <Icon name="info" size={12} />
                <AtlasText size={14} color={sub}>
                  Data & map sources
                </AtlasText>
              </Button>
            </div>
          </div>
        )}
        {small && !sheetOpen && (
          <Button
            label="Open forecast"
            onClick={() => setSheetOpen(true)}
            style={{
              ...box,
              position: "absolute",
              bottom: 8,
              left: 12,
              right: 12,
              paddingBlock: 9,
              gap: 9,
            }}
          >
            <Icon name="map-pin" size={13} color={accent} />
            <AtlasText size={16} face="bold">
              {point.name}
            </AtlasText>
            {current && (
              <AtlasText size={14}>
                {temp(current.c, unit)}° · {current.desc}
              </AtlasText>
            )}
            <Icon name="chevron-up" size={14} />
          </Button>
        )}
      </div>
      <dialog
        ref={dialog}
        className="place-dialog"
        aria-labelledby="dialog-title"
        onCancel={() => setModal("")}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const r = event.currentTarget.getBoundingClientRect();

          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            setModal("");
        }}
      >
        <div
          className="stack"
          style={{ ...row, justifyContent: "space-between" }}
        >
          <AtlasText id="dialog-title" face="display" size={23}>
            {modal === "saved"
              ? "Saved points"
              : modal === "search"
                ? "Find a point"
                : "Data & map sources"}
          </AtlasText>
          <Button
            label="Close"
            style={{ padding: 5 }}
            onClick={() => setModal("")}
          >
            <Icon name="x" />
          </Button>
        </div>
        {modal === "search" && (
          <>
            <input
              aria-label="Place name or coordinates"
              autoFocus
              placeholder="Place name or latitude, longitude"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) choose(results[0]);
              }}
              style={{
                ...box,
                padding: 12,
                fontSize: 16,
                color: ink,
              }}
            />
            {searchState && (
              <AtlasText size={12} color={sub}>
                {searchState}
              </AtlasText>
            )}
          </>
        )}
        {(modal === "search" || modal === "saved") && (
          <div className="stack scroll">
            {(modal === "saved" ? saved : results).map((p, i) => (
              <Button
                key={key(p) + i}
                onClick={() => choose(p)}
                style={{
                  justifyContent: "flex-start",
                  paddingBlock: 11,
                  borderBottomWidth: 1,
                  borderColor: line,
                  gap: 10,
                }}
              >
                <Icon name="map-pin" color={accent} />
                <div className="stack" style={{ flex: 1 }}>
                  <AtlasText face="bold">{p.name}</AtlasText>
                  <AtlasText size={12} color={sub}>
                    {p.region}
                  </AtlasText>
                </div>
              </Button>
            ))}
            {modal === "saved" && !saved.length && (
              <AtlasText color={sub}>
                Use the bookmark on a point forecast to save it here.
              </AtlasText>
            )}
          </div>
        )}
        {modal === "sources" && (
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
                "OpenFreeMap",
                "Street cartography © OpenMapTiles, with data from OpenStreetMap contributors. Rendered by MapLibre.",
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
                "Public-domain coastlines and geographic names.",
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
                onClick={() =>
                  window.open(url, "_blank", "noopener,noreferrer")
                }
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
        )}
      </dialog>
    </main>
  );
}
