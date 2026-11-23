import { useState, useEffect, useRef } from "react";
import Atlas from "../atlas/Atlas";
import ForecastPanel, {
  type ForecastPanelHandle,
} from "../forecast/panel/ForecastPanel";
import {
  home,
  seed,
  key,
  forecast,
  coordinatePlace,
  reverseGeocode,
  type Forecast,
  type Place,
} from "../forecast/weather";
import AppDialog, { type DialogView } from "./AppDialog";
import Toolbar from "./Toolbar";

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
  const panel = useRef<ForecastPanelHandle>(null);
  const panelWidth = Math.min(548, Math.round(width * 0.46));

  const [point, setPoint] = useState(home),
    [data, setForecast] = useState<Forecast | null>(seed),
    [state, setStatus] = useState<"loading" | "live" | "offline">("loading"),
    [unit, setFahrenheit] = useState(false),
    [saved, setSaved] = useState<Place[]>([]),
    [focus, setFocus] = useState(0),
    [retry, setRetry] = useState(0),
    [modal, setModal] = useState<DialogView>(""),
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
    if (!point.resolveName && point.region !== "Selected coordinates") return;
    const ctrl = new AbortController();

    reverseGeocode(point, ctrl.signal)
      .then((label) => {
        if (!label || ctrl.signal.aborted) return;

        const resolved = {
          lat: point.lat,
          lon: point.lon,
          name: point.resolveName ? label.name : point.name,
          region: label.region,
        };

        setPoint((current) => (current === point ? resolved : current));

        setSaved((items) =>
          items.map((p) =>
            (p.resolveName || p.region === "Selected coordinates") &&
            key(p) === key(point)
              ? { ...resolved, lat: p.lat, lon: p.lon }
              : p,
          ),
        );
      })
      .catch(() => {
        // Coordinates still identify this forecast when the lookup is unavailable.
      });

    return () => ctrl.abort();
  }, [point]);

  const selected = saved.some((p) => key(p) === key(point)),
    toggle = () =>
      setSaved((s) =>
        s.some((p) => key(p) === key(point))
          ? s.filter((p) => key(p) !== key(point))
          : [point, ...s],
      );

  function selectPlace(p: Place, center = true) {
    setPoint(p);
    panel.current?.openOverview();
    if (center) setFocus((v) => v + 1);
    setModal("");
  }

  useEffect(() => {
    const timer = setInterval(() => setRetry((n) => n + 1), 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="stack app">
      <div className="stack" style={{ flex: 1, overflow: "hidden" }}>
        <div className="stack" style={{ position: "absolute", inset: 0 }}>
          <Atlas
            point={point}
            focus={focus}
            sidebar={small ? 0 : panelWidth + 32}
            onPick={(lat, lon, name) => {
              selectPlace(
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
        <Toolbar
          small={small}
          fahrenheit={unit}
          onHome={() => selectPlace(home)}
          onSearch={() => setModal("search")}
          onSaved={() => setModal("saved")}
          onUnitChange={setFahrenheit}
        />
        <ForecastPanel
          ref={panel}
          small={small}
          height={height}
          panelWidth={panelWidth}
          point={point}
          unit={unit}
          selected={selected}
          data={data}
          state={state}
          onToggleSaved={toggle}
          onRetry={() => setRetry((v) => v + 1)}
          onSources={() => setModal("sources")}
        />
      </div>
      <AppDialog
        modal={modal}
        onClose={() => setModal("")}
        saved={saved}
        onSelect={selectPlace}
      />
    </main>
  );
}
