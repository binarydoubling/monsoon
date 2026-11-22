import React, { useEffect, useRef, useState } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./atlas.css";
import type { Place } from "./weather";
import { atlasStyle, imageryLayers, providerURL } from "./basemap";
import {
  atmospherePosition,
  solarElevation,
  solarPosition,
  sunlightTile,
} from "./sun";
import { drawSpace } from "./space";

maplibregl.addProtocol("monsoon-sunlight", async () => ({
  data: await sunlightTile(solarPosition(Date.now())),
}));

export interface AtlasProps {
  point: Place;
  focus: number;
  sidebar: number;
  onPick: (lat: number, lon: number, name?: string) => Promise<void>;
}
const initial: [number, number] = [-25, 40];
const formatPosition = (lat: number, lon: number) =>
  Math.abs(lat).toFixed(2) +
  "°" +
  (lat < 0 ? "S" : "N") +
  "  " +
  Math.abs(lon).toFixed(2) +
  "°" +
  (lon < 0 ? "W" : "E");
export default function Atlas(props: AtlasProps) {
  const host = useRef<HTMLDivElement>(null),
    sky = useRef<HTMLCanvasElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    pin = useRef<maplibregl.Marker | null>(null),
    latest = useRef(props),
    lastFocus = useRef(props.focus),
    [failure, setFailure] = useState(""),
    [detailUnavailable, setDetailUnavailable] = useState(false),
    [attempt, retry] = useState(0),
    [menuOpen, setMenuOpen] = useState(false),
    [layers, setLayers] = useState({
      satellite: true,
      grid: false,
      streets: false,
      labels: true,
    }),
    providerLayers = useRef<StyleSpecification["layers"]>([]),
    [position, setPosition] = useState(formatPosition(initial[1], initial[0]));
  const [sunReadout, setSunReadout] = useState("");
  latest.current = props;
  const layerPrefs = useRef(layers);
  layerPrefs.current = layers;
  function syncVisibility(m: maplibregl.Map) {
    const prefs = layerPrefs.current;
    for (const id of ["relief", "iceland-relief"]) {
      m.setLayoutProperty(
        id,
        "visibility",
        prefs.satellite ? "none" : "visible",
      );
    }
    for (const id of imageryLayers) {
      if (m.getLayer(id))
        m.setLayoutProperty(
          id,
          "visibility",
          prefs.satellite ? "visible" : "none",
        );
    }
    if (m.getLayer("meridians"))
      m.setLayoutProperty(
        "meridians",
        "visibility",
        prefs.grid ? "visible" : "none",
      );
    for (const layer of providerLayers.current) {
      if (!m.getLayer(layer.id)) continue;
      const visible =
        layer.type === "symbol"
          ? prefs.labels && (prefs.streets || layer["source-layer"] === "place")
          : prefs.streets;
      m.setLayoutProperty(
        layer.id,
        "visibility",
        visible ? (layer.layout?.visibility ?? "visible") : "none",
      );
    }
  }
  useEffect(() => {
    if (map.current?.getLayer("meridians")) syncVisibility(map.current);
  }, [layers]);
  useEffect(() => {
    const el = host.current;
    const starCanvas = sky.current;
    if (!el || !starCanvas) return;
    const controller = new AbortController();
    let m: maplibregl.Map;
    const padding = {
      left: 0,
      right: latest.current.sidebar,
      top: 60,
      bottom: 0,
    };
    const extent = Math.max(
      200,
      Math.min(el.clientWidth - padding.right, el.clientHeight - 90),
    );
    try {
      m = new maplibregl.Map({
        container: el,
        style: atlasStyle(window.devicePixelRatio),
        center: initial,
        zoom: Math.log2(extent / 240),
        minZoom: -1,
        maxZoom: 19,
        attributionControl: false,
        canvasContextAttributes: { antialias: true },
        maxPitch: 50,
        dragRotate: false,
        touchPitch: false,
      });
    } catch {
      setFailure(
        "The globe needs WebGL. Enable hardware acceleration or try another browser.",
      );
      return;
    }
    map.current = m;
    m.setPadding(padding);
    let instant = new Date();
    let sun = solarPosition(instant.getTime());
    const paintSky = () => drawSpace(starCanvas, m, sun);
    function updateReadout() {
      const center = m.getCenter();
      const altitude = solarElevation(sun, center.lng, center.lat);
      const phase =
        altitude >= -0.833
          ? "Daylight"
          : altitude >= -18
            ? "Twilight"
            : "Night";
      setSunReadout(
        `${phase} · Sun ${altitude >= 0 ? "+" : "−"}${Math.abs(altitude).toFixed(1)}° · ${instant.toISOString().slice(11, 16)} UTC`,
      );
    }
    function updateSun() {
      if (document.hidden) return;
      instant = new Date();
      sun = solarPosition(instant.getTime());
      if (m.getSource("sunlight")) {
        m.setLight({ anchor: "map", position: atmospherePosition(sun) });
        m.refreshTiles("sunlight");
      }
      paintSky();
      updateReadout();
    }
    paintSky();
    updateReadout();
    m.on("move", paintSky);
    m.on("resize", paintSky);
    const clock = window.setInterval(updateSun, 15000);
    document.addEventListener("visibilitychange", updateSun);
    window.addEventListener("focus", updateSun);
    m.touchZoomRotate.disableRotation();
    m.getCanvas().setAttribute(
      "aria-label",
      "Forecast globe. Drag to explore or select a point.",
    );
    const marker = document.createElement("div");
    marker.className = "point-marker";
    const title = document.createElement("span");
    title.textContent = latest.current.point.name;
    marker.appendChild(title);
    const p = latest.current.point;
    pin.current = new maplibregl.Marker({
      element: marker,
      anchor: "center",
      subpixelPositioning: true,
      opacityWhenCovered: 0,
    })
      .setLngLat([p.lon, p.lat])
      .addTo(m);
    m.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        visualizePitch: false,
      }),
      "bottom-left",
    );
    m.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    m.on("click", (e) => {
      const at = m.project(e.lngLat);
      if (Math.hypot(at.x - e.point.x, at.y - e.point.y) > 3) return;
      const feature = m
        .queryRenderedFeatures(e.point)
        .find(
          (f) =>
            f.layer.type === "symbol" && typeof f.properties.name === "string",
        );
      void latest.current.onPick(
        e.lngLat.lat,
        e.lngLat.wrap().lng,
        feature?.properties.name,
      );
    });
    marker.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const p = latest.current.point;
      void latest.current.onPick(p.lat, p.lon, p.name);
    });
    m.on("moveend", () => {
      const c = m.getCenter().wrap();
      setPosition(formatPosition(c.lat, c.lng));
      updateReadout();
    });
    m.on("style.load", () => syncVisibility(m));
    m.once("load", async () => {
      try {
        const response = await fetch(providerURL, {
          signal: controller.signal,
        });
        if (!response.ok) throw Error();
        const detail: StyleSpecification = await response.json();
        if (!controller.signal.aborted) {
          providerLayers.current = detail.layers;
          m.setStyle(atlasStyle(m.getPixelRatio(), detail));
          syncVisibility(m);
        }
      } catch {
        if (!controller.signal.aborted) setDetailUnavailable(true);
      }
    });
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(el);
    return () => {
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", updateSun);
      window.removeEventListener("focus", updateSun);
      controller.abort();
      observer.disconnect();
      pin.current?.remove();
      pin.current = null;
      map.current = null;
      m.remove();
    };
  }, [attempt]);
  useEffect(() => {
    const p = props.point;
    const marker = pin.current;
    if (!marker) return;
    marker.setLngLat([p.lon, p.lat]);
    const title = marker.getElement().firstElementChild;
    if (title) title.textContent = p.name;
    if (lastFocus.current !== props.focus) {
      lastFocus.current = props.focus;
      map.current?.easeTo({ center: [p.lon, p.lat], zoom: 6.2, duration: 550 });
    }
  }, [props.point, props.focus]);
  useEffect(() => {
    map.current?.setPadding({
      right: props.sidebar,
      left: 0,
      top: 60,
      bottom: 0,
    });
  }, [props.sidebar]);
  const world = () => {
    const el = host.current;
    if (!el) return;
    map.current?.easeTo({
      zoom: Math.log2(
        Math.max(
          200,
          Math.min(el.clientWidth - props.sidebar, el.clientHeight - 90),
        ) / 240,
      ),
      duration: 500,
    });
  };
  return (
    <div
      className="monsoon-map"
      style={{ "--sidebar": props.sidebar + "px" } as React.CSSProperties}
    >
      <canvas className="space-sky" aria-hidden="true" ref={sky} />
      <div className="globe-surface" ref={host} />
      <div className="atlas-tools">
        <button
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Map layers"
        >
          <span>Layers ▾</span>
        </button>
        {menuOpen && (
          <div className="layer-choices">
            {(
              [
                ["satellite", "Satellite imagery"],
                ["streets", "Street detail"],
                ["labels", "Place labels"],
                ["grid", "Coordinate grid"],
              ] as const
            ).map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={layers[id]}
                  onChange={(e) =>
                    setLayers({ ...layers, [id]: e.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        )}
        <button
          onClick={world}
          title="View entire globe"
          aria-label="World view"
        >
          ◎ <span>World view</span>
        </button>
        <button
          aria-label="Center selected point"
          title="Center selected point"
          onClick={() =>
            map.current?.easeTo({
              center: [props.point.lon, props.point.lat],
              zoom: 6.2,
            })
          }
        >
          ⌖
        </button>
      </div>
      <div className="map-readout">
        <strong>MAP CENTER</strong>
        <span>{position}</span>
        <small>{sunReadout}</small>
      </div>
      {(failure || detailUnavailable) && (
        <div className="map-message">
          {failure || "Street detail is offline. The globe is still available."}{" "}
          <button
            onClick={() => {
              setFailure("");
              setDetailUnavailable(false);
              retry((n) => n + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
