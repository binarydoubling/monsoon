import { useMemo, type ReactNode } from "react";
import { solarElevation, solarPosition } from "./sun";
import { compass, temp, wind } from "./weather";
import type { Coordinates, ForecastHour } from "./weather";
import "./minute-clock.css";

export default function Conditions({
  hour,
  t,
  label,
  point,
  zone,
  fahrenheit,
  children,
}: {
  hour?: ForecastHour;
  t: number;
  label: string;
  point: Coordinates;
  zone: string;
  fahrenheit: boolean;
  children?: ReactNode;
}) {
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
      }),
    [zone],
  );

  const instant = new Date(t * 1000);

  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map(({ type, value }) => [type, value]),
  );

  const elevation = solarElevation(
    solarPosition(t * 1000),
    point.lon,
    point.lat,
  );

  const speed = wind(hour?.kmh ?? null, fahrenheit);

  const readings = [
    ["Humidity", hour?.hum == null ? "—" : Math.round(hour.hum) + "%"],
    ["Sun elevation", (elevation > 0 ? "+" : "") + elevation.toFixed(1) + "°"],
    ["Precip. chance", hour?.rain == null ? "—" : Math.round(hour.rain) + "%"],
    [
      "Wind",
      speed == null
        ? "—"
        : speed +
          (fahrenheit ? " mph " : " km/h ") +
          compass(hour?.dir ?? null),
    ],
    [
      "Pressure",
      hour?.pressure == null ? "—" : Math.round(hour.pressure) + " hPa",
    ],
  ];

  return (
    <section className="hour-details" aria-label={label}>
      <div className="conditions-hero">
        <strong className="display">
          {hour ? temp(hour.c, fahrenheit, 1) + "°" : "—"}
          {hour && <small>{fahrenheit ? "F" : "C"}</small>}
        </strong>
        <time
          className="minute-local-clock"
          dateTime={instant.toISOString()}
          aria-label={formatter.format(instant)}
          title={zone}
        >
          <span className="minute-calendar">
            {parts.weekday}, {parts.month} {parts.day}
          </span>
          <span className="minute-clock-face">
            <span className="minute-digits">
              {parts.hour}:{parts.minute}
            </span>
            <span className="minute-clock-suffix">
              <span>{parts.dayPeriod}</span>
              <span>{parts.timeZoneName}</span>
            </span>
          </span>
        </time>
      </div>
      <div className="minute-condition-line">
        <span className="minute-description">
          {hour?.desc ?? "Forecast unavailable"}
        </span>
        {children}
      </div>
      <dl>
        {readings.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
