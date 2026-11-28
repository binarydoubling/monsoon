import { useEffect, useId, useMemo, useState } from "react";
import Conditions, { WeatherBackground } from "../Conditions";
import LocationHeading from "../LocationHeading";
import type { Place, Forecast, ForecastHour } from "../weather";
import { temp } from "../weather";
import WeatherArt from "../WeatherArt";
import { describePeriod } from "../dayStory";
import { forecastPeriods, periodLabel } from "./forecastPeriods";
import "./daily.css";

function CurrentConditions({
  hour,
  point,
  zone,
  fahrenheit,
  label,
}: {
  hour: ForecastHour;
  point: Place;
  zone: string;
  fahrenheit: boolean;
  label: string;
}) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    let timer: number;

    function tick() {
      window.clearTimeout(timer);
      if (document.hidden) return;

      const ms = Date.now();
      setNow(Math.floor(ms / 1000));
      timer = window.setTimeout(tick, 1000 - (ms % 1000));
    }

    tick();
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return (
    <div className="current-weather">
      <WeatherBackground t={now} point={point} hour={hour} />
      <Conditions
        hour={hour}
        t={now}
        point={point}
        zone={zone}
        fahrenheit={fahrenheit}
        label={label}
        heading={<h2 className="display">{label}</h2>}
        showSeconds
      />
    </div>
  );
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export default function DailyForecast({
  forecast,
  point,
  fahrenheit,
  saved = false,
}: {
  forecast: Forecast;
  point: Place;
  fahrenheit: boolean;
  saved?: boolean;
}) {
  const { current, zone } = forecast;
  const [selected, select] = useState<string | null>(null);
  const id = useId();

  const periods = useMemo(
    () =>
      forecastPeriods(forecast, saved ? undefined : Date.now() / 1000).flatMap(
        ({ date, daily, periods }, index) =>
          periods.map(({ name, hours }) => {
            const day = name === "Day";

            const summary = hours.length
              ? describePeriod(hours, day, zone, fahrenheit)
              : null;

            const temps = hours.map((h) => h.c);
            const chances = hours.map((h) => h.rain ?? 0);

            return {
              key: date + name,
              label: periodLabel(date, name, index === 0 && !saved),
              day,
              c: temps.length
                ? day
                  ? Math.max(...temps)
                  : Math.min(...temps)
                : day
                  ? daily?.high
                  : daily?.low,
              rain: chances.length ? Math.max(...chances) : daily?.rain,
              desc: summary?.desc ?? daily?.desc ?? "Conditions unavailable",
              time: summary?.time,
              text:
                summary?.text ?? "Hourly forecast unavailable for this period.",
            };
          }),
      ),
    [forecast, zone, fahrenheit, saved],
  );

  const heading = saved ? "Saved conditions" : "Current conditions";

  function show(key: string) {
    select(key);

    document.getElementById(id + key)?.scrollIntoView({
      block: "nearest",
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  }

  return (
    <div className="daily-overview">
      <div className="daily-layout">
        {current ? (
          <CurrentConditions
            hour={current}
            point={point}
            zone={zone}
            fahrenheit={fahrenheit}
            label={heading}
          />
        ) : (
          <div className="current-weather">
            <LocationHeading point={point} />
            <h2 className="display">{heading}</h2>
            <p className="daily-unavailable">Current conditions unavailable.</p>
          </div>
        )}
        <section className="daily-week" aria-label="Daily forecast">
          <h2 className="display">Daily forecast</h2>
          {periods.length ? (
            <>
              <ol className="tombstones">
                {periods.map((p) => (
                  <li key={p.key}>
                    <button
                      type="button"
                      className={p.day ? "tombstone" : "tombstone night"}
                      aria-current={selected === p.key || undefined}
                      onClick={() => show(p.key)}
                    >
                      <span className="tombstone-name">{p.label}</span>
                      <span className="tombstone-art">
                        <WeatherArt desc={p.desc} day={p.day} size={56} />
                        {p.rain != null && p.rain >= 20 && (
                          <span
                            className="tombstone-pop"
                            aria-label={`${p.rain}% chance of precipitation`}
                          >
                            {Math.round(p.rain / 10) * 10}%
                          </span>
                        )}
                      </span>
                      <span className="tombstone-desc">{p.desc}</span>
                      {p.c != null && (
                        <span
                          className={p.day ? "tombstone-high" : "tombstone-low"}
                        >
                          {p.day ? "High" : "Low"}{" "}
                          <strong>{temp(p.c, fahrenheit)}°</strong>
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
              <dl className="period-details">
                {periods.map((p) => (
                  <div
                    key={p.key}
                    id={id + p.key}
                    className={selected === p.key ? "selected" : undefined}
                  >
                    <dt>
                      <WeatherArt desc={p.desc} day={p.day} size={30} />
                      <span>
                        {p.label}
                        {p.time && <small>{p.time}</small>}
                      </span>
                    </dt>
                    <dd>{p.text}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="daily-unavailable">Daily forecast unavailable.</p>
          )}
        </section>
      </div>
    </div>
  );
}
