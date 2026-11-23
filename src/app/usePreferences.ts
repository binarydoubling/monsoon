import { useCallback, useEffect, useState } from "react";
import { coordinatePlace, key, type Place } from "../forecast/weather";

export function usePreferences() {
  const [fahrenheit, setFahrenheit] = useState(false);
  const [saved, setSaved] = useState<Place[]>([]);
  const [storageReady, setStorageReady] = useState(false);

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
      localStorage.setItem("monsoon:unit", fahrenheit ? "F" : "C");
    } catch {
      /* Preferences still work for this session. */
    }
  }, [saved, fahrenheit, storageReady]);

  function toggleSaved(point: Place) {
    setSaved((items) =>
      items.some((item) => key(item) === key(point))
        ? items.filter((item) => key(item) !== key(point))
        : [point, ...items],
    );
  }

  const updateSavedLabel = useCallback((resolved: Place) => {
    setSaved((items) =>
      items.map((p) =>
        (p.resolveName || p.region === "Selected coordinates") &&
        key(p) === key(resolved)
          ? { ...resolved, lat: p.lat, lon: p.lon }
          : p,
      ),
    );
  }, []);

  return { fahrenheit, setFahrenheit, saved, toggleSaved, updateSavedLabel };
}
