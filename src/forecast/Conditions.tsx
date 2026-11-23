import {
  lazy,
  Suspense,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from "react";
import LocationHeading from "./LocationHeading";
import WeatherArt from "./WeatherArt";
import { compass, temp, wind } from "./weather";
import type { Place, ForecastHour } from "./weather";
import "./minute-clock.css";

const ForecastSky = lazy(() => import("./ForecastSky"));

export function WeatherBackground(props: ComponentProps<typeof ForecastSky>) {
  return (
    <Suspense fallback={null}>
      <ForecastSky {...props} />
    </Suspense>
  );
}

export default function Conditions({
  hour,
  t,
  label,
  point,
  zone,
  fahrenheit,
  heading,
  children,
  showSeconds = false,
}: {
  hour?: ForecastHour;
  t: number;
  label: string;
  point: Place;
  zone: string;
  fahrenheit: boolean;
  heading?: ReactNode;
  children?: ReactNode;
  showSeconds?: boolean;
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
        second: showSeconds ? "2-digit" : undefined,
        hour12: true,
        timeZoneName: "short",
      }),
    [zone, showSeconds],
  );

  const instant = new Date(t * 1000);

  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map(({ type, value }) => [type, value]),
  );

  const speed = wind(hour?.kmh ?? null, fahrenheit);

  const mmPerHour = hour?.precipMmPerHour;
  const rate = mmPerHour == null ? null : mmPerHour / (fahrenheit ? 25.4 : 1);
  const minRate = fahrenheit ? 0.01 : 0.1;

  const formattedRate =
    rate == null
      ? "—"
      : (rate > 0 && rate < minRate
          ? "<" + minRate
          : Number(rate.toFixed(fahrenheit ? 2 : 1))) +
        (fahrenheit ? " in/h" : " mm/h");

  const readings = [
    [
      "Feels like",
      hour?.feelsLikeC == null
        ? "—"
        : temp(hour.feelsLikeC, fahrenheit, 1) + (fahrenheit ? "°F" : "°C"),
    ],
    ["Humidity", hour?.hum == null ? "—" : Math.round(hour.hum) + "%"],
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
    ["Precip. rate", formattedRate],
  ];

  return (
    <section className="hour-details" aria-label={label}>
      <div className="conditions-header">
        <LocationHeading point={point} />
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
              {showSeconds && (
                <span className="clock-seconds">:{parts.second}</span>
              )}
            </span>
            <span className="minute-clock-suffix">
              <span>{parts.dayPeriod}</span>
              <span>{parts.timeZoneName}</span>
            </span>
          </span>
        </time>
      </div>
      {heading}
      <div className="conditions-hero">
        <WeatherArt
          desc={hour?.desc ?? "Conditions unavailable"}
          day={hour?.day}
          size={76}
        />
        <strong className="display">
          {hour ? temp(hour.c, fahrenheit, 1) + "°" : "—"}
          {hour && <small>{fahrenheit ? "F" : "C"}</small>}
        </strong>
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
