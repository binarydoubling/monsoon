import Conditions from "./Conditions";
import type { Coordinates, Forecast } from "./weather";
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

export default function DailyForecast({
  forecast,
  point,
  fahrenheit,
  saved = false,
}: {
  forecast: Forecast;
  point: Coordinates;
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
        <div>
          <h2 className="display">{heading}</h2>
          {current ? (
            <Conditions
              hour={current}
              t={current.t}
              point={point}
              zone={zone}
              fahrenheit={fahrenheit}
              label={heading}
            />
          ) : (
            <p className="daily-unavailable">Current conditions unavailable.</p>
          )}
        </div>
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
