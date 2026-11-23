import { useEffect, useMemo, useState } from "react";
import Conditions, { WeatherBackground } from "./Conditions";
import LocationHeading from "./LocationHeading";
import type { Place, Forecast, ForecastHour } from "./weather";
import { temp } from "./weather";
import WeatherArt from "./WeatherArt";
import { describePeriod } from "./dayStory";
import { forecastPeriods } from "./forecastPeriods";
import "./daily.css";

const dateHeading = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

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

  const outlook = useMemo(
    () =>
      forecastPeriods(forecast, saved ? undefined : Date.now() / 1000).map(
        ({ date, daily, periods }) => ({
          date,
          daily,
          periods: periods.map(({ name, hours }) => ({
            name,
            summary: hours.length
              ? describePeriod(hours, name === "Day", zone, fahrenheit)
              : null,
          })),
        }),
      ),
    [forecast, zone, fahrenheit, saved],
  );

  const heading = saved ? "Saved conditions" : "Current conditions";

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
          {outlook.length ? (
            outlook.map(({ date, daily, periods }, index) => (
              <details className="daily-date" key={date} open={index === 0}>
                <summary>
                  {daily && (
                    <span className="daily-symbol" title={daily.desc}>
                      <WeatherArt desc={daily.desc} size={24} />
                    </span>
                  )}
                  <time dateTime={date}>
                    {dateHeading.format(new Date(date + "T12:00Z"))}
                  </time>
                  <span className="daily-extremes">
                    {daily?.high != null && (
                      <span
                        className="daily-high"
                        aria-label={
                          "Daily high " +
                          temp(daily.high, fahrenheit) +
                          " degrees"
                        }
                      >
                        H {temp(daily.high, fahrenheit)}°
                      </span>
                    )}
                    {daily?.low != null && (
                      <span
                        aria-label={
                          "Daily low " +
                          temp(daily.low, fahrenheit) +
                          " degrees"
                        }
                      >
                        L {temp(daily.low, fahrenheit)}°
                      </span>
                    )}
                  </span>
                </summary>
                {periods.map(({ name, summary }) => (
                  <section
                    className="daily-period"
                    aria-label={name + " forecast"}
                    key={name}
                  >
                    <WeatherArt
                      desc={summary?.desc ?? "Conditions unavailable"}
                      day={name === "Day"}
                      size={38}
                    />
                    <div>
                      <h3>
                        {name} {summary && <span>{summary.time}</span>}
                      </h3>
                      <p>
                        {summary?.text ??
                          "Hourly forecast unavailable for this period."}
                      </p>
                    </div>
                  </section>
                ))}
              </details>
            ))
          ) : (
            <p className="daily-unavailable">Daily forecast unavailable.</p>
          )}
        </section>
      </div>
    </div>
  );
}
