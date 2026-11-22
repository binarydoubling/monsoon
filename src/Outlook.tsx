import React, { useState, useRef, useEffect } from "react";
import {
  AtlasText,
  Button,
  Icon,
  Label,
  WeatherArt,
  ink,
  sub,
  card,
  orange,
  line,
  row,
  box,
} from "./ui";
import { local, wind } from "./weather";
import type { ForecastHour } from "./weather";

const gestureStyle = {
  position: "absolute",
  inset: 0,
  touchAction: "pan-y",
  cursor: "pointer",
} as const;

const metrics = [
  ["Temperature", "thermometer"],
  ["Precipitation", "droplet"],
  ["Wind", "wind"],
] as const;

export default function Outlook({
  hours,
  zone,
  f,
}: {
  hours: ForecastHour[];
  zone: string;
  f: boolean;
}) {
  const [duration, setDuration] = useState(24),
    [metric, setMetric] = useState(0),
    [index, setIndex] = useState(0),
    [width, setWidth] = useState(340);

  const chart = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chart.current) return;

    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(90, entry.contentRect.width)),
    );

    observer.observe(chart.current);
    return () => observer.disconnect();
  }, []);

  const small = width < 540;
  const data = hours.slice(0, duration);
  if (!data.length) return null;

  const unit =
    metric === 0
      ? f
        ? "°F"
        : "°C"
      : metric === 1
        ? "%"
        : f
          ? " mph"
          : " km/h";

  const vals = data.map((h) =>
    metric === 0
      ? Math.round((f ? (h.c * 9) / 5 + 32 : h.c) * 10) / 10
      : metric === 1
        ? h.rain
        : h.kmh == null
          ? null
          : wind(h.kmh, f),
  );

  const valid = vals.filter(
      (v): v is number => v !== null && Number.isFinite(v),
    ),
    min = Math.min(...valid),
    max = Math.max(...valid);

  const tick = Math.max(1, Math.ceil((max - min) / 3)),
    floor = Number.isFinite(min) ? Math.floor(min / tick) * tick - tick : 0,
    ceiling = Number.isFinite(max) ? Math.ceil(max / tick) * tick + tick : 3;

  const left = 36,
    end = width - 15,
    top = 12,
    bottom = 110;

  const x = (i: number) =>
      left + ((end - left) * i) / Math.max(1, vals.length - 1),
    y = (v: number) =>
      bottom - ((v - floor) / (ceiling - floor)) * (bottom - top);

  const idx = Math.min(index, data.length - 1),
    h = data[idx],
    clock = (t: number) =>
      local(t, zone, { hour: "numeric" }).toLowerCase().replace(" ", "");

  const pick = (e: React.PointerEvent<HTMLDivElement>) =>
    setIndex(
      Math.max(
        0,
        Math.min(
          data.length - 1,
          Math.round(
            ((e.clientX - e.currentTarget.getBoundingClientRect().left - left) /
              (end - left)) *
              (data.length - 1),
          ),
        ),
      ),
    );

  const segments: [number, number][][] = [];
  let seg: [number, number][] = [];

  vals.forEach((v, i) => {
    if (v !== null && Number.isFinite(v)) seg.push([x(i), y(v)]);
    else if (seg.length) {
      segments.push(seg);
      seg = [];
    }
  });

  if (seg.length) segments.push(seg);
  const color = ["#ab603c", "#407d91", "#54806e"][metric];

  const peak = vals.indexOf(max),
    low = vals.indexOf(min);

  const stamp = (i: number) =>
    local(data[i].t, zone, { weekday: "short", hour: "numeric" }).replace(
      ",",
      "",
    );

  const weatherChange = data.findIndex((v) => v.desc !== data[0].desc);

  const skyStory =
    weatherChange > 0
      ? " " + data[weatherChange].desc + " by " + stamp(weatherChange) + "."
      : "";

  const narrative =
    valid.length === 0
      ? "Hourly values are unavailable for this variable."
      : min === max
        ? "Holding near " +
          min +
          unit +
          " throughout the next " +
          data.length +
          " hours."
        : metric === 0
          ? "Temperatures " +
            (peak < low ? "fall from " : "rise from ") +
            (peak < low ? max : min) +
            "° at " +
            stamp(peak < low ? peak : low) +
            " to " +
            (peak < low ? min : max) +
            "° at " +
            stamp(peak < low ? low : peak) +
            "."
          : metric === 1
            ? "Precipitation chance peaks at " +
              max +
              "% around " +
              stamp(peak) +
              "."
            : "The strongest winds reach " +
              max +
              unit +
              " around " +
              stamp(peak) +
              ".";

  const slots = Array.from(
    { length: Math.min(small ? 3 : 4, data.length) },
    (_, i) =>
      Math.floor((i * data.length) / Math.min(small ? 3 : 4, data.length)),
  );

  return (
    <div
      className="stack"
      style={{ borderTopWidth: 1, borderColor: line, padding: 16, gap: 13 }}
    >
      <div
        className="stack"
        style={{ ...row, justifyContent: "space-between", gap: 8 }}
      >
        <div className="stack" style={{ ...row, gap: 10 }}>
          <Icon name="activity" size={23} color={orange} />
          <AtlasText face="serif" size={small ? 25 : 31}>
            Hourly outlook
          </AtlasText>
        </div>
        <div
          className="stack"
          style={{
            ...row,
            borderWidth: 1,
            borderColor: line,
            borderRadius: 5,
            padding: 2,
          }}
        >
          {[24, 48].map((n) => (
            <Button
              key={n}
              onClick={() => {
                setDuration(n);
                setIndex(0);
              }}
              style={{
                paddingInline: small ? 9 : 13,
                paddingBlock: 5,
                borderRadius: 3,
                backgroundColor: duration === n ? ink : "transparent",
              }}
            >
              <AtlasText
                face="mono"
                size={11}
                color={duration === n ? card : sub}
              >
                {n}h
              </AtlasText>
            </Button>
          ))}
        </div>
      </div>
      <div
        className="stack"
        style={{ ...row, gap: small ? 5 : 8, flexWrap: "wrap" }}
      >
        {metrics.map(([n, ic], i) => (
          <Button
            key={n}
            onClick={() => setMetric(i)}
            style={{
              borderWidth: 1,
              borderColor: i === metric ? "#b9c8b6" : line,
              backgroundColor: i === metric ? "#e3eadc" : "transparent",
              borderRadius: 20,
              paddingBlock: 6,
              paddingInline: small ? 8 : 13,
            }}
          >
            <Icon name={ic} size={13} />
            <AtlasText size={small ? 11 : 12} face="bold">
              {n}
            </AtlasText>
          </Button>
        ))}
        {!small && (
          <div className="stack" style={{ marginLeft: "auto" }}>
            <Label>
              LOCAL TIME ·{" "}
              {(zone.split("/").pop() ?? zone)
                .replaceAll("_", " ")
                .toUpperCase()}
            </Label>
          </div>
        )}
      </div>
      <div
        className="stack"
        style={{ ...row, borderTopWidth: 1, borderColor: line, paddingTop: 12 }}
      >
        {slots.map((i, j) => (
          <Button
            label={"Inspect " + stamp(i)}
            key={i}
            onClick={() => setIndex(i)}
            style={{
              flex: 1,
              justifyContent: "flex-start",
              alignItems: "center",
              gap: small ? 3 : 8,
              paddingRight: 3,
            }}
          >
            <WeatherArt
              desc={data[i].desc}
              day={data[i].day}
              size={small ? 27 : 35}
            />
            <div className="stack" style={{ flex: 1 }}>
              <AtlasText face="mono" size={small ? 9 : 10} color={sub}>
                {stamp(i).toUpperCase()}
              </AtlasText>
              <AtlasText size={small ? 11 : 13} numberOfLines={2}>
                {data[i].desc}
              </AtlasText>
            </div>
          </Button>
        ))}
      </div>
      <div className="stack" ref={chart} style={{ height: 141 }}>
        <svg width="100%" height="141" pointerEvents="none">
          <defs>
            <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity=".3" />
              <stop offset="1" stopColor={color} stopOpacity=".035" />
            </linearGradient>
          </defs>
          {Array.from({ length: 4 }, (_, i) => {
            const yy = top + (i * (bottom - top)) / 3;

            return (
              <g key={i}>
                <line
                  x1={left}
                  y1={yy}
                  x2={end}
                  y2={yy}
                  stroke={line}
                  strokeDasharray="3 4"
                />
                <text
                  x={left - 8}
                  y={yy + 3}
                  textAnchor="end"
                  fill={sub}
                  fontSize="10"
                >
                  {Math.round(ceiling - ((ceiling - floor) * i) / 3)}
                  {metric === 0 ? "°" : metric === 1 ? "%" : ""}
                </text>
              </g>
            );
          })}
          {segments.map((s, i) => {
            const path = s
              .map(([a, b], j) => {
                if (!j) return "M" + a + " " + b;
                const mid = (a + s[j - 1][0]) / 2;

                return (
                  "C" +
                  mid +
                  " " +
                  s[j - 1][1] +
                  " " +
                  mid +
                  " " +
                  b +
                  " " +
                  a +
                  " " +
                  b
                );
              })
              .join(" ");

            return (
              <g key={i}>
                <path
                  d={
                    path +
                    " L" +
                    s[s.length - 1][0] +
                    " " +
                    bottom +
                    " L" +
                    s[0][0] +
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
          {data.map((v, i) => {
            if (
              i % Math.ceil(data.length / (small ? 5 : 9)) !== 0 &&
              i !== data.length - 1
            )
              return null;

            if (i !== data.length - 1 && data.length - i <= 2) return null;

            return (
              <g key={i}>
                {vals[i] != null && (
                  <circle
                    cx={x(i)}
                    cy={y(vals[i])}
                    r={3}
                    fill={card}
                    stroke={color}
                    strokeWidth={1.5}
                  />
                )}
                <text
                  x={x(i)}
                  y={133}
                  fontSize={10}
                  fill={sub}
                  textAnchor={i === data.length - 1 ? "end" : "middle"}
                >
                  {clock(v.t)}
                </text>
              </g>
            );
          })}
          {vals[idx] != null && (
            <g>
              <line
                x1={x(idx)}
                x2={x(idx)}
                y1={top}
                y2={bottom}
                stroke={color}
                strokeDasharray="3 4"
              />
              <circle
                cx={x(idx)}
                cy={y(vals[idx])}
                r={5}
                fill={color}
                stroke={card}
                strokeWidth={2}
              />
            </g>
          )}
        </svg>
        <div
          className="stack"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pick(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              pick(event);
          }}
          style={gestureStyle}
        />
      </div>
      <div
        className="stack"
        style={{
          ...row,
          gap: 10,
          borderTopWidth: 1,
          borderColor: line,
          paddingTop: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="stack" style={{ ...row, gap: 6 }}>
          <Button
            label="Previous hour"
            onClick={() => setIndex(Math.max(0, idx - 1))}
          >
            <Icon name="chevron-left" size={16} />
          </Button>
          <AtlasText face="mono" size={11}>
            {clock(h.t).toUpperCase()} · {vals[idx] ?? "—"}
            {unit}
          </AtlasText>
          <Button
            label="Next hour"
            onClick={() => setIndex(Math.min(data.length - 1, idx + 1))}
          >
            <Icon name="chevron-right" size={16} />
          </Button>
        </div>
        <AtlasText size={13} color={sub} style={{ flexGrow: 1 }}>
          {narrative}
          {skyStory}
        </AtlasText>
      </div>
    </div>
  );
}
