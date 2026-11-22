import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  G,
  Defs,
  LinearGradient,
  Stop,
  Path,
  Line,
  Circle,
  Text as ST,
} from "react-native-svg";
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
import type { GestureResponderEvent } from "react-native";
const gestureStyle = {
  ...StyleSheet.absoluteFillObject,
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
  const pick = (e: GestureResponderEvent) =>
    setIndex(
      Math.max(
        0,
        Math.min(
          data.length - 1,
          Math.round(
            ((e.nativeEvent.locationX - left) / (end - left)) *
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
    <View
      style={{ borderTopWidth: 1, borderColor: line, padding: 16, gap: 13 }}
    >
      <View style={[row, { justifyContent: "space-between", gap: 8 }]}>
        <View style={[row, { gap: 10 }]}>
          <Icon name="activity" size={23} color={orange} />
          <AtlasText face="serif" size={small ? 25 : 31}>
            Hourly outlook
          </AtlasText>
        </View>
        <View
          style={[
            row,
            { borderWidth: 1, borderColor: line, borderRadius: 5, padding: 2 },
          ]}
        >
          {[24, 48].map((n) => (
            <Button
              key={n}
              onPress={() => {
                setDuration(n);
                setIndex(0);
              }}
              style={{
                paddingHorizontal: small ? 9 : 13,
                paddingVertical: 5,
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
        </View>
      </View>
      <View style={[row, { gap: small ? 5 : 8, flexWrap: "wrap" }]}>
        {metrics.map(([n, ic], i) => (
          <Button
            key={n}
            onPress={() => setMetric(i)}
            style={{
              borderWidth: 1,
              borderColor: i === metric ? "#b9c8b6" : line,
              backgroundColor: i === metric ? "#e3eadc" : "transparent",
              borderRadius: 20,
              paddingVertical: 6,
              paddingHorizontal: small ? 8 : 13,
            }}
          >
            <Icon name={ic} size={13} />
            <AtlasText size={small ? 11 : 12} face="bold">
              {n}
            </AtlasText>
          </Button>
        ))}
        {!small && (
          <View style={{ marginLeft: "auto" }}>
            <Label>
              LOCAL TIME ·{" "}
              {(zone.split("/").pop() ?? zone)
                .replaceAll("_", " ")
                .toUpperCase()}
            </Label>
          </View>
        )}
      </View>
      <View
        style={[row, { borderTopWidth: 1, borderColor: line, paddingTop: 12 }]}
      >
        {slots.map((i, j) => (
          <Button
            label={"Inspect " + stamp(i)}
            key={i}
            onPress={() => setIndex(i)}
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
            <View style={{ flex: 1 }}>
              <AtlasText face="mono" size={small ? 9 : 10} color={sub}>
                {stamp(i).toUpperCase()}
              </AtlasText>
              <AtlasText size={small ? 11 : 13} numberOfLines={2}>
                {data[i].desc}
              </AtlasText>
            </View>
          </Button>
        ))}
      </View>
      <View
        onLayout={(e) => setWidth(Math.max(90, e.nativeEvent.layout.width))}
        style={{ height: 141 }}
      >
        <Svg width="100%" height="141" pointerEvents="none">
          <Defs>
            <LinearGradient id="area" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity=".3" />
              <Stop offset="1" stopColor={color} stopOpacity=".035" />
            </LinearGradient>
          </Defs>
          {Array.from({ length: 4 }, (_, i) => {
            const yy = top + (i * (bottom - top)) / 3;
            return (
              <G key={i}>
                <Line
                  x1={left}
                  y1={yy}
                  x2={end}
                  y2={yy}
                  stroke={line}
                  strokeDasharray="3 4"
                />
                <ST
                  x={left - 8}
                  y={yy + 3}
                  textAnchor="end"
                  fill={sub}
                  fontSize="10"
                >
                  {Math.round(ceiling - ((ceiling - floor) * i) / 3)}
                  {metric === 0 ? "°" : metric === 1 ? "%" : ""}
                </ST>
              </G>
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
              <G key={i}>
                <Path
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
                <Path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.7}
                  strokeLinejoin="round"
                />
              </G>
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
              <G key={i}>
                {vals[i] != null && (
                  <Circle
                    cx={x(i)}
                    cy={y(vals[i])}
                    r={3}
                    fill={card}
                    stroke={color}
                    strokeWidth={1.5}
                  />
                )}
                <ST
                  x={x(i)}
                  y={133}
                  fontSize={10}
                  fill={sub}
                  textAnchor={i === data.length - 1 ? "end" : "middle"}
                >
                  {clock(v.t)}
                </ST>
              </G>
            );
          })}
          {vals[idx] != null && (
            <G>
              <Line
                x1={x(idx)}
                x2={x(idx)}
                y1={top}
                y2={bottom}
                stroke={color}
                strokeDasharray="3 4"
              />
              <Circle
                cx={x(idx)}
                cy={y(vals[idx])}
                r={5}
                fill={color}
                stroke={card}
                strokeWidth={2}
              />
            </G>
          )}
        </Svg>
        <View
          onStartShouldSetResponder={() => true}
          onResponderGrant={pick}
          onResponderMove={pick}
          style={gestureStyle}
        />
      </View>
      <View
        style={{
          ...row,
          gap: 10,
          borderTopWidth: 1,
          borderColor: line,
          paddingTop: 12,
          flexWrap: "wrap",
        }}
      >
        <View style={[row, { gap: 6 }]}>
          <Button
            label="Previous hour"
            onPress={() => setIndex(Math.max(0, idx - 1))}
          >
            <Icon name="chevron-left" size={16} />
          </Button>
          <AtlasText face="mono" size={11}>
            {clock(h.t).toUpperCase()} · {vals[idx] ?? "—"}
            {unit}
          </AtlasText>
          <Button
            label="Next hour"
            onPress={() => setIndex(Math.min(data.length - 1, idx + 1))}
          >
            <Icon name="chevron-right" size={16} />
          </Button>
        </View>
        <AtlasText size={13} color={sub} style={{ flexGrow: 1 }}>
          {narrative}
          {skyStory}
        </AtlasText>
      </View>
    </View>
  );
}
