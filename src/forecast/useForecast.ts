import { useCallback, useEffect, useRef, useState } from "react";
import { forecast, home, key, seed, type Forecast } from "./weather";

export function useForecast(lat: number, lon: number) {
  const forecastPoint = useRef(key({ lat, lon }));

  const [data, setForecast] = useState<Forecast | null>(() =>
    forecastPoint.current === key(home) ? seed : null,
  );

  const [state, setStatus] = useState<"loading" | "live" | "offline">(
    "loading",
  );

  const [request, setRequest] = useState(0);
  const retry = useCallback(() => setRequest((n) => n + 1), []);

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
  }, [lat, lon, request]);

  useEffect(() => {
    const timer = setInterval(retry, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [retry]);

  return { data, state, retry };
}
