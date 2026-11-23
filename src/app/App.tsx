import { useState, useEffect, useRef } from "react";
import Atlas from "../atlas/Atlas";
import ForecastPanel, {
  type ForecastPanelHandle,
} from "../forecast/panel/ForecastPanel";
import {
  home,
  key,
  coordinatePlace,
  reverseGeocode,
  type Place,
} from "../forecast/weather";
import { usePreferences } from "./usePreferences";
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

  const [point, setPoint] = useState(home);
  const [focus, setFocus] = useState(0);
  const [modal, setModal] = useState<DialogView>("");

  const { fahrenheit, setFahrenheit, saved, toggleSaved, updateSavedLabel } =
    usePreferences();

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

        updateSavedLabel(resolved);
      })
      .catch(() => {
        // Coordinates still identify this forecast when the lookup is unavailable.
      });

    return () => ctrl.abort();
  }, [point, updateSavedLabel]);

  function selectPlace(p: Place, center = true) {
    setPoint(p);
    panel.current?.openOverview();
    if (center) setFocus((v) => v + 1);
    setModal("");
  }

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
          fahrenheit={fahrenheit}
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
          fahrenheit={fahrenheit}
          selected={saved.some((item) => key(item) === key(point))}
          onToggleSaved={() => toggleSaved(point)}
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
