import { useEffect, useState } from "react";
import Conditions, { WeatherBackground } from "./Conditions";
import LocationHeading from "./LocationHeading";
import type { Place, Forecast, ForecastHour } from "./weather";
import { temp } from "./weather";
import { WeatherArt } from "./ui";
import "./daily.css";

const weekday = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

const fullDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
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
      <LocationHeading point={point} />
      <h2 className="display">{label}</h2>
      <Conditions
        hour={hour}
        t={now}
        point={point}
        zone={zone}
        fahrenheit={fahrenheit}
        label={label}
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
  const { current, daily, zone } = forecast;

  const temperatures = daily.flatMap(({ high, low }) =>
    [low, high].filter((v): v is number => v !== null),
  );

  const minimum = Math.min(...temperatures);
  const span = Math.max(...temperatures) - minimum;
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
          {daily.length ? (
            <table aria-label="Daily forecast temperatures">
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col" aria-label="Conditions" />
                  <th scope="col">Low</th>
                  <th scope="col" aria-label="Temperature range" />
                  <th scope="col">High</th>
                </tr>
              </thead>
              <tbody>
                {daily.map(({ date, desc, low, high }) => {
                  const civilDate = new Date(date + "T12:00:00Z");
                  const label = fullDate.format(civilDate);

                  return (
                    <tr key={date}>
                      <th scope="row">
                        <time dateTime={date} title={label} aria-label={label}>
                          {weekday.format(civilDate)}
                        </time>
                      </th>
                      <td className="daily-condition-cell">
                        <span className="daily-weather">
                          <span aria-hidden="true">
                            <WeatherArt desc={desc} size={22} />
                          </span>
                          {desc}
                        </span>
                      </td>
                      <td className="daily-low">
                        {low === null ? "—" : temp(low, fahrenheit) + "°"}
                      </td>
                      <td className="daily-range-cell">
                        {low !== null && high !== null && (
                          <span className="daily-range" aria-hidden="true">
                            <span
                              style={{
                                left:
                                  (span ? (100 * (low - minimum)) / span : 50) +
                                  "%",
                                right:
                                  (span
                                    ? 100 * (1 - (high - minimum) / span)
                                    : 50) + "%",
                              }}
                            />
                          </span>
                        )}
                      </td>
                      <td className="daily-high">
                        {high === null ? "—" : temp(high, fahrenheit) + "°"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="daily-unavailable">Daily forecast unavailable.</p>
          )}
        </section>
      </div>
    </div>
  );
}
