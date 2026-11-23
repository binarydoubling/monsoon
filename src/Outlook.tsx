import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { daylightIntervals } from "./sun";
import { describeDay } from "./dayStory";
import Conditions, { WeatherBackground } from "./Conditions";
import { forecastMinute } from "./minute";
import { Button, Icon } from "./ui";
import WeatherArt from "./WeatherArt";
import type { ForecastHour, Place } from "./weather";

const pixelsPerMinute = 4;
const metrics = ["Temperature", "Precipitation", "Wind"] as const;
type Metric = (typeof metrics)[number];

function measurement(
  hour: ForecastHour | undefined,
  metric: Metric,
  fahrenheit: boolean,
) {
  if (!hour) return null;
  if (metric === "Temperature") return fahrenheit ? hour.c * 1.8 + 32 : hour.c;
  if (metric === "Precipitation") return hour.rain;
  return hour.kmh == null ? null : hour.kmh / (fahrenheit ? 1.609344 : 1);
}

export default function Outlook({
  hours,
  start,
  initialMinute,
  zone,
  f,
  point,
  saved,
}: {
  hours: ForecastHour[];
  start: number;
  initialMinute: number;
  zone: string;
  f: boolean;
  point: Place;
  saved: boolean;
}) {
  const lastMinute = Math.max(
    0,
    Math.floor(((hours.at(-1)?.t ?? start) - start) / 60),
  );

  const daylight = useMemo(
    () => daylightIntervals(start, lastMinute, point.lon, point.lat),
    [start, lastMinute, point.lon, point.lat],
  );

  const viewport = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const [minute, setMinute] = useState(Math.min(initialMinute, lastMinute));
  const [metric, setMetric] = useState<Metric>("Temperature");
  const [width, setWidth] = useState(400);

  useLayoutEffect(() => {
    const el = viewport.current;
    const graph = plot.current;
    const contents = stage.current;
    if (!el || !graph || !contents) return;
    el.scrollTop = initialMinute * pixelsPerMinute;

    const resize = new ResizeObserver(() => {
      setWidth(graph.clientWidth);
      // Short windows reveal the whole inspector before it pins against the bottom.
      const overflow = Math.max(0, contents.offsetHeight - el.clientHeight);
      el.style.setProperty("--stage-overflow", overflow + "px");
    });

    resize.observe(contents);
    resize.observe(el);
    resize.observe(graph);

    const horizontalScroll = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;

      if (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY))
        return;

      event.preventDefault();

      const scale =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? el.clientHeight
            : 1;

      el.scrollTop += (event.deltaX || event.deltaY) * scale;
    };

    el.addEventListener("wheel", horizontalScroll, { passive: false });

    return () => {
      resize.disconnect();
      el.removeEventListener("wheel", horizontalScroll);
    };
  }, [initialMinute]);

  function selectMinute(value: number) {
    const next = Math.max(0, Math.min(lastMinute, Math.round(value)));
    if (viewport.current) viewport.current.scrollTop = next * pixelsPerMinute;
    setMinute(next);
  }

  const selected = forecastMinute(hours, start, minute);

  const formatTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    [zone],
  );

  const clock = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hour: "numeric",
        minute: "2-digit",
      }),
    [zone],
  );

  const selectedTime = formatTime.format(selected.t * 1000);

  const left = 40,
    right = Math.max(left + 1, width - 12),
    top = 33,
    bottom = 118;

  const x = (m: number) =>
    left + ((right - left) * m) / Math.max(1, lastMinute);

  const unit =
    metric === "Temperature"
      ? f
        ? "°F"
        : "°C"
      : metric === "Wind"
        ? f
          ? " mph"
          : " km/h"
        : "%";

  const color =
    metric === "Temperature"
      ? "var(--mauve)"
      : metric === "Wind"
        ? "var(--teal)"
        : "var(--blue)";

  const samples = useMemo(
    () =>
      Array.from({ length: Math.ceil(lastMinute / 60) + 1 }, (_, i) => {
        const offset = Math.min(i * 60, lastMinute);
        const { hour } = forecastMinute(hours, start, offset);
        return { offset, value: measurement(hour, metric, f) };
      }),
    [hours, start, metric, f, lastMinute],
  );

  const values = samples.flatMap(({ value }) => (value == null ? [] : [value]));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const step = Math.max(1, Math.ceil((max - min) / 3));
  const floor = Math.floor(min / step) * step - step;
  const ceiling = Math.ceil(max / step) * step + step;

  const y = (v: number) =>
    bottom - ((bottom - top) * (v - floor)) / (ceiling - floor);

  const segments: { offset: number; value: number }[][] = [];
  let segment: { offset: number; value: number }[] = [];

  for (const { offset, value } of samples) {
    if (value == null) {
      segment = [];
      continue;
    }

    if (!segment.length) segments.push(segment);
    segment.push({ offset, value });
  }

  const value = measurement(selected.hour, metric, f);

  const tickCount = Math.min(lastMinute + 1, width < 440 ? 4 : 5);

  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Math.round((lastMinute * i) / Math.max(1, tickCount - 1)),
  );

  const weekday = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }),
    [zone],
  );

  const dayAt = (m: number) => weekday.format((start + m * 60) * 1000);
  const timeAt = (m: number) => clock.format((start + m * 60) * 1000);
  const pretty = (v: number) => Number(v.toFixed(1)) + unit;

  const calendar = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    [zone],
  );

  const day = calendar.format(selected.t * 1000);

  const story = useMemo(
    () =>
      describeDay(
        hours.filter((h) => calendar.format(h.t * 1000) === day),
        zone,
        f,
      ),
    [hours, calendar, day, zone, f],
  );

  function pick(event: PointerEvent<HTMLDivElement>) {
    const pos =
      event.clientX - event.currentTarget.getBoundingClientRect().left;

    selectMinute(((pos - left) / (right - left)) * lastMinute);
  }

  return (
    <div
      className="minute-scroll"
      aria-label="Minute explorer timeline"
      ref={viewport}
      onScroll={(event) => {
        if (event.target === event.currentTarget)
          setMinute(
            Math.min(
              lastMinute,
              Math.round(event.currentTarget.scrollTop / pixelsPerMinute),
            ),
          );
      }}
    >
      <section
        ref={stage}
        className="minute-stage"
        aria-label="Minute forecast"
      >
        <WeatherBackground t={selected.t} point={point} hour={selected.hour} />
        <Conditions
          t={selected.t}
          hour={selected.hour}
          label="Selected minute conditions"
          heading={saved && <small>Saved forecast</small>}
          point={point}
          zone={zone}
          fahrenheit={f}
        >
          <div className="minute-arrows">
            <Button
              className="control hour-step"
              label="Previous minute"
              disabled={minute === 0}
              onClick={() => selectMinute(minute - 1)}
            >
              <Icon name="chevron-left" size={20} />
            </Button>
            <Button
              className="control hour-step"
              label="Next minute"
              disabled={minute === lastMinute}
              onClick={() => selectMinute(minute + 1)}
            >
              <Icon name="chevron-right" size={20} />
            </Button>
          </div>
        </Conditions>
        <div className="minute-metrics" aria-label="Chart variable">
          {metrics.map((name) => (
            <button
              type="button"
              key={name}
              aria-pressed={name === metric}
              style={{ borderColor: name === metric ? color : undefined }}
              onClick={() => setMetric(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div
          className="minute-graph"
          ref={plot}
          role="slider"
          tabIndex={0}
          aria-label="Forecast minute"
          aria-description="Yellow bands mark daylight from sunrise to sunset at this point."
          aria-valuemin={0}
          aria-valuemax={lastMinute}
          aria-valuenow={minute}
          aria-valuetext={
            selectedTime +
            " · " +
            (value == null ? "Unavailable" : pretty(value))
          }
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") pick(e);
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pick(e);
          }}
          onPointerMove={(e) => {
            if (
              e.pointerType !== "touch" ||
              e.currentTarget.hasPointerCapture(e.pointerId)
            )
              pick(e);
          }}
          onKeyDown={(e) => {
            const keys: Record<string, number> = {
              ArrowLeft: minute - 1,
              ArrowRight: minute + 1,
              ArrowDown: minute - 1,
              ArrowUp: minute + 1,
              PageDown: minute + 60,
              PageUp: minute - 60,
              Home: 0,
              End: lastMinute,
            };

            if (keys[e.key] == null) return;
            e.preventDefault();
            selectMinute(keys[e.key]);
          }}
        >
          <svg width="100%" height="182" aria-hidden="true">
            <defs>
              <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity=".3" />
                <stop offset="1" stopColor={color} stopOpacity=".035" />
              </linearGradient>
            </defs>
            <g
              className="daylight-bands"
              fill="var(--yellow)"
              fillOpacity={0.17}
            >
              {daylight.map(({ from, to }) => (
                <rect
                  key={from}
                  x={x(from)}
                  y={top}
                  width={x(to) - x(from)}
                  height={bottom - top}
                />
              ))}
            </g>
            {[floor, (ceiling + floor) / 2, ceiling].map((v) => (
              <g key={v}>
                <line
                  x1={left}
                  y1={y(v)}
                  x2={right}
                  y2={y(v)}
                  stroke="var(--surface1)"
                  strokeDasharray="3 4"
                />
                <text x={left - 6} y={y(v) + 4} textAnchor="end">
                  {Math.round(v)}
                  {metric === "Temperature"
                    ? "°"
                    : metric === "Precipitation"
                      ? "%"
                      : ""}
                </text>
              </g>
            ))}
            {segments.map((s) => {
              const first = s[0],
                last = s[s.length - 1];

              if (s.length === 1)
                return (
                  <circle
                    key={first.offset}
                    cx={x(first.offset)}
                    cy={y(first.value)}
                    r={3}
                    fill={color}
                  />
                );

              const path = s
                .map(
                  ({ offset, value }, i) =>
                    (i ? "L" : "M") + x(offset) + " " + y(value),
                )
                .join(" ");

              return (
                <g key={first.offset}>
                  <path
                    d={
                      path +
                      " L" +
                      x(last.offset) +
                      " " +
                      bottom +
                      " L" +
                      x(first.offset) +
                      " " +
                      bottom +
                      " Z"
                    }
                    fill="url(#area)"
                  />
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.7}
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
            {ticks.map((m) => {
              const hour = forecastMinute(hours, start, m).hour;
              const labelX = Math.max(left, Math.min(right - 17, x(m)));

              return (
                <g key={m}>
                  {hour && (
                    <WeatherArt
                      x={labelX - 13}
                      y={120}
                      desc={hour.desc}
                      day={hour.day}
                    />
                  )}
                  <text x={labelX} y={158} textAnchor="middle">
                    {dayAt(m)}
                    <tspan x={labelX} dy="15">
                      {timeAt(m)}
                    </tspan>
                  </text>
                </g>
              );
            })}
            <line
              x1={x(minute)}
              x2={x(minute)}
              y1={24}
              y2={bottom}
              stroke={color}
              strokeDasharray="3 4"
            />
            {value != null && (
              <circle
                cx={x(minute)}
                cy={y(value)}
                r={5}
                fill={color}
                stroke="var(--mantle)"
                strokeWidth={2}
              />
            )}
            <g
              className="cursor-time"
              transform={`translate(${Math.max(left + 2, Math.min(width - 45, x(minute)))}, 1)`}
            >
              <rect x="-40" y="0" width="80" height="23" rx="5" fill={color} />
              <text textAnchor="middle" y="16">
                {timeAt(minute)}
              </text>
            </g>
          </svg>
        </div>
        <section className="minute-story" aria-label="Daily outlook">
          <h3>{day}</h3>
          <p>{story}</p>
        </section>
      </section>
      <div
        aria-hidden="true"
        style={{
          height: `calc(${lastMinute * pixelsPerMinute}px - var(--stage-overflow, 0px))`,
        }}
      />
    </div>
  );
}
