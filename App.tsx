import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  Linking,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import Feather from "@expo/vector-icons/Feather";
import Storage from "@react-native-async-storage/async-storage";
import Atlas from "./src/Atlas";
import Outlook from "./src/Outlook";
import {
  AtlasText,
  Button,
  Icon,
  Logo,
  Label,
  WeatherArt,
  row,
  box,
  ink,
  sub,
  line,
  orange,
  paper,
  card,
} from "./src/ui";
import {
  home,
  places,
  seed,
  key,
  coords,
  forecast,
  local,
  temp,
  wind,
  compass,
  getJSON,
} from "./src/weather";
import type { Forecast, Place } from "./src/weather";
import type { IconName } from "./src/ui";
interface SearchResponse {
  results?: {
    name: string;
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
  }[];
}
const fonts = {
  ...Feather.font,
  sans: require("@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf"),
  bold: require("@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf"),
  serif: require("@expo-google-fonts/dm-serif-display/400Regular/DMSerifDisplay_400Regular.ttf"),
  mono: require("@expo-google-fonts/ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf"),
};
function AppBody() {
  const { width, height } = useWindowDimensions(),
    small = width < 760;
  const [sheetOpen, setSheetOpen] = useState(false);
  const panelWidth = Math.min(384, Math.round(width * 0.4));
  const [point, setPoint] = useState(home),
    [data, setForecast] = useState<Forecast | null>(seed),
    [state, setStatus] = useState<"loading" | "live" | "offline">("loading"),
    [unit, setFahrenheit] = useState(false),
    [saved, setSaved] = useState<Place[]>([]),
    [focus, setFocus] = useState(0),
    [retry, setRetry] = useState(0),
    [modal, setModal] = useState<"" | "saved" | "search" | "sources">(""),
    [query, setQuery] = useState(""),
    [results, setResults] = useState(places),
    [searchState, setSearchStatus] = useState(""),
    [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    Storage.multiGet(["monsoon:saved", "monsoon:unit"])
      .then(([[, s], [, f]]) => {
        if (s) setSaved(JSON.parse(s));
        setFahrenheit(f === "F");
      })
      .catch(() => {})
      .finally(() => setStorageReady(true));
  }, []);
  useEffect(() => {
    if (storageReady)
      Storage.multiSet([
        ["monsoon:saved", JSON.stringify(saved)],
        ["monsoon:unit", unit ? "F" : "C"],
      ]).catch(() => {});
  }, [saved, unit, storageReady]);
  useEffect(() => {
    const ctrl = new AbortController();
    setStatus("loading");
    setForecast(key(point) === key(home) ? seed : null);
    forecast(point, ctrl.signal)
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
  }, [point, retry]);
  useEffect(() => {
    if (modal !== "search") return;
    const text = query.trim(),
      ctrl = new AbortController();
    const cached = places.filter((p) =>
      (p.name + " " + p.region).toLowerCase().includes(text.toLowerCase()),
    );
    setResults(cached);
    setSearchStatus("");
    if (!text) return;
    const coord = text.match(
      /^\s*([+-]?\d+(?:\.\d+)?)\s*[, ]\s*([+-]?\d+(?:\.\d+)?)\s*$/,
    );
    if (coord) {
      const lat = Number(coord[1]),
        lon = Number(coord[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180)
        setResults([
          { name: "Dropped pin", region: coords({ lat, lon }), lat, lon },
        ]);
      else
        setSearchStatus(
          "Latitude must be within ±90° and longitude within ±180°.",
        );
      return;
    }
    if (text.length < 2) return;
    setSearchStatus("Searching…");
    const timer = setTimeout(async () => {
      try {
        const v = await getJSON<SearchResponse>(
          "https://geocoding-api.open-meteo.com/v1/search?count=8&language=en&name=" +
            encodeURIComponent(text),
          ctrl.signal,
        );
        if (ctrl.signal.aborted) return;
        const rows = (v.results || []).map((p) => ({
          name: p.name,
          region: [p.admin1, p.country].filter(Boolean).join(", "),
          lat: p.latitude,
          lon: p.longitude,
        }));
        setResults(rows.length ? rows : cached);
        setSearchStatus(
          rows.length || cached.length
            ? ""
            : "No places found. Try coordinates.",
        );
      } catch {
        if (!ctrl.signal.aborted)
          setSearchStatus(
            "Place search is offline. You can still enter coordinates.",
          );
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [modal, query]);
  const selected = saved.some((p) => key(p) === key(point)),
    toggle = () =>
      setSaved((s) =>
        s.some((p) => key(p) === key(point))
          ? s.filter((p) => key(p) !== key(point))
          : [point, ...s],
      );
  function choose(p: Place, center = true) {
    setPoint(p);
    setSheetOpen(true);
    if (center) setFocus((v) => v + 1);
    setModal("");
  }
  function openSearch() {
    setQuery("");
    setModal("search");
  }
  useEffect(() => {
    const timer = setInterval(() => setRetry((n) => n + 1), 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  const future =
    data?.hours.filter((h) => h.t + 3600 > Date.now() / 1000) || [];
  const hours = future.length ? future : data?.hours || [],
    h = hours[0];
  const clock =
    data &&
    h &&
    local(h.t, data.zone, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  const date =
    data &&
    h &&
    local(h.t, data.zone, { weekday: "short", month: "short", day: "numeric" });
  const nextDay = hours.slice(0, 24).map((a) => temp(a.c, unit));
  const metrics: [IconName, string, React.ReactNode][] = h
    ? [
        [
          "wind",
          "Wind",
          (wind(h.kmh, unit) ?? "—") +
            (unit ? " mph" : " km/h") +
            " " +
            compass(h.dir),
        ],
        ["droplet", "Humidity", h.hum == null ? "—" : Math.round(h.hum) + "%"],
        ["umbrella", "Precipitation", h.rain == null ? "—" : h.rain + "%"],
        [
          h.pressure == null ? "clock" : "activity",
          h.pressure == null ? "Local hour" : "Pressure",
          h.pressure == null ? clock : Math.round(h.pressure) + " hPa",
        ],
      ]
    : [];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#102125" }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, overflow: "hidden" }}>
        <View style={StyleSheet.absoluteFill}>
          <Atlas
            point={point}
            focus={focus}
            sidebar={small ? 0 : panelWidth + 32}
            dom={{
              scrollEnabled: false,
              style: { flex: 1, backgroundColor: "#102125" },
            }}
            onPick={async (lat, lon, name) => {
              choose(
                name === point.name &&
                  Math.abs(lat - point.lat) < 0.0001 &&
                  Math.abs(lon - point.lon) < 0.0001
                  ? point
                  : {
                      lat,
                      lon,
                      name: name || "Dropped pin",
                      region: "Selected coordinates",
                    },
                false,
              );
            }}
          />
        </View>
        <View
          style={[
            row,
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: small ? 57 : 66,
              paddingHorizontal: small ? 12 : 23,
              backgroundColor: "#112427",
              borderBottomColor: "#405553",
              borderBottomWidth: 1,
              gap: small ? 9 : 18,
            },
          ]}
        >
          <Button label="Monsoon home" onPress={() => choose(home)}>
            <Logo />
            <AtlasText
              face="serif"
              size={small ? 25 : 31}
              color={card}
              style={{ letterSpacing: -1 }}
            >
              Monsoon
            </AtlasText>
          </Button>
          {!small && (
            <View
              style={{
                paddingLeft: 15,
                borderLeftWidth: 1,
                borderColor: "#57706a",
              }}
            >
              <Label color="#c6d3c5">WEATHER ATLAS</Label>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Button
            onPress={openSearch}
            label="Search places or coordinates"
            style={{
              height: 35,
              paddingHorizontal: 9,
              borderWidth: small ? 0 : 1,
              borderColor: "#4a625f",
              borderRadius: 5,
            }}
          >
            <Icon name="search" size={17} color={card} />
            {!small && (
              <AtlasText size={13} color={card}>
                Search places or coordinates
              </AtlasText>
            )}
          </Button>
          <Button
            label="Saved points"
            onPress={() => setModal("saved")}
            style={{ padding: 4 }}
          >
            <Icon name="bookmark" size={17} color={card} />
            {!small && (
              <AtlasText size={13} color={card}>
                Saved points
              </AtlasText>
            )}
          </Button>
          <View
            style={[
              row,
              {
                borderWidth: 1,
                borderColor: "#506661",
                borderRadius: 5,
                padding: 2,
              },
            ]}
          >
            {[false, true].map((f) => (
              <Button
                key={String(f)}
                label={f ? "Use Fahrenheit" : "Use Celsius"}
                onPress={() => setFahrenheit(f)}
                style={{
                  paddingHorizontal: small ? 5 : 8,
                  paddingVertical: 4,
                  borderRadius: 3,
                  backgroundColor: f === unit ? card : "transparent",
                }}
              >
                <AtlasText
                  face="mono"
                  size={11}
                  color={f === unit ? ink : card}
                >
                  {f ? "°F" : "°C"}
                </AtlasText>
              </Button>
            ))}
          </View>
        </View>
        {(!small || sheetOpen) && (
          <View
            accessibilityLabel="Forecast panel"
            style={[
              box,
              {
                position: "absolute",
                overflow: "hidden",
                backgroundColor: paper,
              },
              small
                ? {
                    bottom: 0,
                    left: 0,
                    right: 0,
                    maxHeight: height * 0.65,
                    borderTopLeftRadius: 17,
                    borderTopRightRadius: 17,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  }
                : { right: 16, top: 82, bottom: 20, width: panelWidth },
            ]}
          >
            {small && (
              <Button
                label="Collapse forecast"
                style={{ paddingVertical: 7 }}
                onPress={() => setSheetOpen(false)}
              >
                <View
                  style={{
                    height: 4,
                    width: 33,
                    borderRadius: 3,
                    backgroundColor: line,
                  }}
                />
              </Button>
            )}
            <ScrollView
              key={key(point)}
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: small ? 10 : 18,
                  gap: 10,
                  backgroundColor: card,
                }}
              >
                <View style={[row, { justifyContent: "space-between" }]}>
                  <View style={[row, { gap: 7 }]}>
                    <Icon name="map-pin" size={13} color={orange} />
                    <Label color={orange}>POINT FORECAST</Label>
                  </View>
                  <View style={[row, { gap: 7 }]}>
                    <Button
                      onPress={toggle}
                      label={selected ? "Remove saved point" : "Save point"}
                      style={{
                        padding: 5,
                        backgroundColor: selected ? "#dde8d8" : paper,
                        borderRadius: 4,
                      }}
                    >
                      <Icon name={selected ? "check" : "bookmark"} size={16} />
                    </Button>
                    {small && (
                      <Button
                        label="Close forecast"
                        onPress={() => setSheetOpen(false)}
                        style={{ padding: 7 }}
                      >
                        <Icon name="x" size={18} />
                      </Button>
                    )}
                  </View>
                </View>
                <View>
                  <AtlasText
                    face="serif"
                    size={35}
                    style={{ letterSpacing: -1.1, lineHeight: 42 }}
                  >
                    {point.name}
                  </AtlasText>
                  <AtlasText color={sub} size={14}>
                    {point.region}
                  </AtlasText>
                  <AtlasText
                    face="mono"
                    color={sub}
                    size={10}
                    style={{ marginTop: 6, letterSpacing: 0.5 }}
                  >
                    {coords(point)}
                  </AtlasText>
                </View>
                {h ? (
                  <>
                    <View style={[row, { justifyContent: "space-between" }]}>
                      <View>
                        <AtlasText
                          face="serif"
                          size={63}
                          style={{ letterSpacing: -3, lineHeight: 72 }}
                        >
                          {temp(h.c, unit)}°
                          <AtlasText size={24} face="sans" color={sub}>
                            {unit ? "F" : "C"}
                          </AtlasText>
                        </AtlasText>
                        <AtlasText size={15} face="bold">
                          {h.desc}
                        </AtlasText>
                      </View>
                      <WeatherArt desc={h.desc} day={h.day} size={89} />
                    </View>
                    <View
                      style={{
                        ...row,
                        borderBottomWidth: 1,
                        borderColor: line,
                        paddingBottom: 10,
                        gap: 10,
                      }}
                    >
                      <AtlasText color={sub} size={11}>
                        24h range
                      </AtlasText>
                      <AtlasText face="mono" size={11}>
                        ↑ {Math.max(...nextDay)}° ↓ {Math.min(...nextDay)}°
                      </AtlasText>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        rowGap: 10,
                      }}
                    >
                      {metrics.map(([ic, n, v]) => (
                        <View key={n} style={{ width: "50%", ...row, gap: 8 }}>
                          <Icon name={ic} size={16} color={sub} />
                          <View>
                            <AtlasText size={10} color={sub}>
                              {n}
                            </AtlasText>
                            <AtlasText face="bold" size={13}>
                              {v}
                            </AtlasText>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={{ paddingVertical: 26 }}>
                    {state === "loading" ? (
                      <ActivityIndicator color={ink} />
                    ) : (
                      <AtlasText>
                        Forecast unavailable for this point.
                      </AtlasText>
                    )}
                  </View>
                )}
                <View style={[row, { gap: 6, marginTop: 6, flexWrap: "wrap" }]}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: state === "live" ? "#5b8459" : "#bb8854",
                    }}
                  />
                  <AtlasText size={10} color={sub}>
                    {data?.source || "Point forecast"}
                    {!future.length && h
                      ? " · archived forecast"
                      : state === "live"
                        ? ""
                        : state === "offline"
                          ? h
                            ? " · saved forecast"
                            : " · offline"
                          : " · updating"}
                    {date ? "  ·  " + date + "  " + clock : ""}
                  </AtlasText>
                  {state === "offline" && (
                    <Button onPress={() => setRetry((v) => v + 1)}>
                      <AtlasText size={11} color={orange}>
                        Retry
                      </AtlasText>
                    </Button>
                  )}
                </View>
              </View>
              {data && h && <Outlook hours={hours} zone={data.zone} f={unit} />}
              <Button
                onPress={() => setModal("sources")}
                style={{ paddingVertical: 8 }}
              >
                <Icon name="info" size={12} />
                <AtlasText size={11} color={sub}>
                  Data & map sources
                </AtlasText>
              </Button>
            </ScrollView>
          </View>
        )}
        {small && !sheetOpen && (
          <Button
            label="Open forecast"
            onPress={() => setSheetOpen(true)}
            style={[
              box,
              {
                position: "absolute",
                bottom: 8,
                left: 12,
                right: 12,
                paddingVertical: 9,
                gap: 9,
              },
            ]}
          >
            <Icon name="map-pin" size={13} color={orange} />
            <AtlasText size={13} face="bold">
              {point.name}
            </AtlasText>
            {h && (
              <AtlasText size={12}>
                {temp(h.c, unit)}° · {h.desc}
              </AtlasText>
            )}
            <Icon name="chevron-up" size={14} />
          </Button>
        )}
      </View>
      <Modal
        visible={!!modal}
        transparent
        animationType="fade"
        onRequestClose={() => setModal("")}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backgroundColor: "#17302866",
          }}
        >
          <Pressable
            accessibilityLabel="Dismiss dialog"
            onPress={() => setModal("")}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            }}
          />
          <View
            style={[
              box,
              {
                width: "100%",
                maxWidth: 500,
                maxHeight: "82%",
                padding: 22,
                gap: 15,
              },
            ]}
          >
            <View style={[row, { justifyContent: "space-between" }]}>
              <AtlasText face="serif" size={27}>
                {modal === "saved"
                  ? "Saved points"
                  : modal === "search"
                    ? "Find a point"
                    : "Data & map sources"}
              </AtlasText>
              <Button
                label="Close"
                style={{ padding: 5 }}
                onPress={() => setModal("")}
              >
                <Icon name="x" />
              </Button>
            </View>
            {modal === "search" && (
              <>
                <TextInput
                  accessibilityLabel="Place name or coordinates"
                  autoFocus
                  placeholder="Place name or latitude, longitude"
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={() => results[0] && choose(results[0])}
                  placeholderTextColor={sub}
                  style={[
                    box,
                    {
                      padding: 12,
                      fontFamily: "sans",
                      fontSize: 16,
                      color: ink,
                    },
                  ]}
                />
                {searchState && (
                  <AtlasText size={12} color={sub}>
                    {searchState}
                  </AtlasText>
                )}
              </>
            )}
            {(modal === "search" || modal === "saved") && (
              <ScrollView keyboardShouldPersistTaps="handled">
                {(modal === "saved" ? saved : results).map((p, i) => (
                  <Button
                    key={key(p) + i}
                    onPress={() => choose(p)}
                    style={{
                      justifyContent: "flex-start",
                      paddingVertical: 11,
                      borderBottomWidth: 1,
                      borderColor: line,
                      gap: 10,
                    }}
                  >
                    <Icon name="map-pin" color={orange} />
                    <View style={{ flex: 1 }}>
                      <AtlasText face="bold">{p.name}</AtlasText>
                      <AtlasText size={12} color={sub}>
                        {p.region}
                      </AtlasText>
                    </View>
                  </Button>
                ))}
                {modal === "saved" && !saved.length && (
                  <AtlasText color={sub}>
                    Use the bookmark on a point forecast to save it here.
                  </AtlasText>
                )}
              </ScrollView>
            )}
            {modal === "sources" && (
              <ScrollView>
                {[
                  [
                    "National Weather Service",
                    "Hourly point forecasts in supported US areas.",
                    "https://www.weather.gov/documentation/services-web-api",
                  ],
                  [
                    "Open-Meteo",
                    "Global hourly forecasts and place search (GeoNames). Weather data licensed CC BY 4.0. Free API for non-commercial use.",
                    "https://open-meteo.com/",
                  ],
                  [
                    "OpenFreeMap",
                    "Street cartography © OpenMapTiles, with data from OpenStreetMap contributors. Rendered by MapLibre.",
                    "https://openfreemap.org/",
                  ],
                  [
                    "EOxCloudless",
                    "Global 10 m satellite mosaic by EOX IT Services GmbH. Contains modified Copernicus Sentinel data 2025. CC BY-NC-SA 4.0.",
                    "https://cloudless.eox.at/license-non-commercial",
                  ],
                  [
                    "U.S. aerial imagery",
                    "USDA and USGS The National Map provide local orthoimagery in the contiguous United States.",
                    "https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map",
                  ],
                  [
                    "Iceland aerial imagery",
                    "Aerial photographs from Náttúrufræðistofnun, where survey coverage is available.",
                    "https://www.natt.is/en/resources/open-data/aerial-photos",
                  ],
                  [
                    "Earth overview",
                    "Solar System Scope (CC BY 4.0), reprojected and tinted for this atlas.",
                    "https://www.solarsystemscope.com/textures/",
                  ],
                  [
                    "Natural Earth",
                    "Public-domain coastlines and geographic names.",
                    "https://www.naturalearthdata.com/",
                  ],
                  [
                    "Mapzen terrain",
                    "Shaded relief derived from Terrain Tiles. View elevation and bathymetry source credits.",
                    "https://github.com/tilezen/joerd/blob/master/docs/attribution.md",
                  ],
                ].map(([name, desc, url]) => (
                  <Button
                    key={name}
                    onPress={() => Linking.openURL(url)}
                    style={{
                      paddingVertical: 10,
                      borderTopWidth: 1,
                      borderColor: line,
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <AtlasText face="bold">{name}</AtlasText>
                      <AtlasText size={13} color={sub}>
                        {desc}
                      </AtlasText>
                    </View>
                    <Icon name="external-link" size={15} />
                  </Button>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
export default function App() {
  const [loaded, error] = useFonts(fonts);
  if (!loaded && !error)
    return (
      <View
        style={{ flex: 1, backgroundColor: paper, justifyContent: "center" }}
      >
        <ActivityIndicator color={ink} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <AppBody />
    </SafeAreaProvider>
  );
}
