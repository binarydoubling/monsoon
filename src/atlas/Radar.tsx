import { useEffect, useState } from "react";
import type { Map as GlobeMap, RasterTileSource } from "maplibre-gl";
import { Pause, Play, RotateCcw } from "lucide-react";
import { getJSON } from "../forecast/weather";

const feed = "https://api.rainviewer.com/public/weather-maps.json";

const credit =
  '<a href="https://www.rainviewer.com/">Weather radar by RainViewer</a>';

const tileOptions = { tileSize: 512, maxzoom: 7, roundZoom: true };
const coverageId = "radar-coverage";
const radarId = "observed-radar";

interface Frame {
  time: number;
  path: string;
}

interface RadarFeed {
  host: string;
  radar?: { past?: Frame[] };
}

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function removeRadar(map: GlobeMap) {
  for (const id of [radarId, coverageId]) {
    if (map.style && map.getLayer(id)) map.removeLayer(id);
    if (map.style && map.getSource(id)) map.removeSource(id);
  }
}

export default function Radar({ map }: { map: GlobeMap }) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [host, setHost] = useState("");
  const [selected, select] = useState<number | null>(null);
  const [playing, play] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [tileError, setTileError] = useState("");
  const [attempt, retry] = useState(0);
  const last = frames.length - 1;

  const index =
    selected == null
      ? last
      : Math.max(
          0,
          frames.findIndex((f) => f.time === selected),
        );

  const frame = frames[index];

  useEffect(() => {
    const control = new AbortController();

    async function refresh() {
      try {
        const data = await getJSON<RadarFeed>(feed, control.signal);
        const base = new URL(data.host);

        if (
          base.protocol !== "https:" ||
          !base.hostname.endsWith(".rainviewer.com")
        )
          throw Error();

        const past = data.radar?.past
          ?.filter(
            (f) =>
              Number.isSafeInteger(f.time) &&
              f.time > 0 &&
              typeof f.path === "string" &&
              /^\/v2\/radar\/[a-zA-Z0-9_-]+$/.test(f.path),
          )
          .sort((a, b) => a.time - b.time);

        if (!past?.length) throw Error();
        if (control.signal.aborted) return;
        setHost(base.origin);
        setFrames(past);
        setFeedError(false);
      } catch {
        if (!control.signal.aborted) setFeedError(true);
      }
    }

    void refresh();
    const clock = window.setInterval(refresh, 300000);

    return () => {
      control.abort();
      window.clearInterval(clock);
    };
  }, [attempt]);

  useEffect(() => {
    const onError = map.on("error", (e) => {
      if (
        "sourceId" in e &&
        (e.sourceId === radarId || e.sourceId === coverageId)
      ) {
        setTileError(
          "status" in e.error && e.error.status === 429
            ? "Radar rate limit reached. Retry in a minute."
            : "Radar tiles unavailable.",
        );

        play(false);
      }
    });

    return () => {
      onError.unsubscribe();

      removeRadar(map);
    };
  }, [map]);

  useEffect(() => {
    if (!frame || tileError) return;
    const base = host + frame.path;
    const tiles = base + "/512/{z}/{x}/{y}/2/1_0.png";
    const coverage = host + "/v2/coverage/0/512/{z}/{x}/{y}/0/0_0.png";

    function sync() {
      if (!map.style || !map.getLayer("state-province-borders")) return;

      for (const [id, url] of [
        [coverageId, coverage],
        [radarId, tiles],
      ]) {
        const source = map.getSource<RasterTileSource>(id);

        if (!source) {
          map.addSource(id, {
            type: "raster",
            tiles: [url],
            tileSize: tileOptions.tileSize,
            maxzoom: tileOptions.maxzoom,
            attribution: credit,
          });
        } else if (source.serialize().tiles?.[0] !== url) {
          source.setTiles([url]);
        }

        if (!map.getLayer(id)) {
          map.addLayer(
            {
              id,
              type: "raster",
              source: id,
              paint: {
                "raster-opacity": id === radarId ? 0.86 : 0.38,
                "raster-fade-duration": 0,
              },
            },
            "state-province-borders",
          );
        }
      }
    }

    // Scrubbing across several frames should request only the one the user settles on.
    const timer = window.setTimeout(() => {
      sync();
      map.on("styledata", sync);
    }, 160);

    return () => {
      window.clearTimeout(timer);
      map.off("styledata", sync);
    };
  }, [map, frame, host, tileError]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    // Pace new frames against the tile service's 100 requests per minute budget.
    const delay = Math.max(1000, map.coveringTiles(tileOptions).length * 800);

    const timer = window.setInterval(() => {
      if (
        document.hidden ||
        map.isMoving() ||
        !map.getSource(radarId) ||
        !map.isSourceLoaded(radarId)
      )
        return;

      select(frames[(index + 1) % frames.length].time);
    }, delay);

    return () => window.clearInterval(timer);
  }, [map, frames, playing, index]);

  function retryRadar() {
    if (tileError) removeRadar(map);
    setFeedError(false);
    setTileError("");

    retry((n) => n + 1);
  }

  const date = frame ? new Date(frame.time * 1000) : null;

  const minutesAgo = frame
    ? Math.round((Date.now() / 1000 - frame.time) / 60)
    : 0;

  const latest = selected === null && !playing;
  const stale = latest && minutesAgo > 30;

  const span =
    frames.length > 1
      ? Math.round((frames[last].time - frames[0].time) / 3600)
      : 0;

  return (
    <section className="radar-panel" aria-label="Precipitation radar">
      <header className="radar-head">
        <span
          className={`radar-dot${feedError || tileError ? " down" : stale ? " stale" : latest ? " live" : ""}`}
          aria-hidden="true"
        />
        <strong>Radar</strong>
        {date && (
          <time
            className="mono"
            dateTime={date.toISOString()}
            title={date.toUTCString()}
          >
            {timeFormat.format(date)}
            <small> UTC</small>
          </time>
        )}
        {frame && (
          <small className="radar-age mono">
            {latest && !stale ? "LIVE" : `−${minutesAgo} min`}
          </small>
        )}
      </header>
      {frame && frames.length > 1 && (
        <div className="radar-playback">
          <button
            type="button"
            aria-label={playing ? "Pause radar" : "Play radar history"}
            disabled={Boolean(tileError)}
            onClick={() => {
              if (!playing && index === last) select(frames[0].time);
              play(!playing);
            }}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <div className="radar-track">
            <div className="radar-ticks" aria-hidden="true">
              {frames.map((f, i) => (
                <i key={f.time} className={i <= index ? "on" : undefined} />
              ))}
            </div>
            <input
              type="range"
              aria-label="Radar frame"
              aria-valuetext={date?.toUTCString()}
              disabled={Boolean(tileError)}
              min={0}
              max={last}
              value={index}
              onChange={(e) => {
                const n = Number(e.target.value);
                play(false);
                select(n === last ? null : frames[n].time);
              }}
            />
            <div className="radar-ends mono" aria-hidden="true">
              <span>−{span}h</span>
              <span>now</span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Show latest radar"
            title="Show latest radar"
            disabled={Boolean(tileError) || latest}
            onClick={() => {
              play(false);
              select(null);
            }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      )}
      {feedError || tileError ? (
        <div className="radar-status" role="status">
          {tileError ||
            (frame ? "Radar update unavailable." : "Radar feed unavailable.")}
          <button type="button" onClick={retryRadar}>
            Retry
          </button>
        </div>
      ) : !frame ? (
        <small role="status">Loading radar…</small>
      ) : null}
      {frame && (
        <footer className="radar-key">
          <span aria-label="Radar reflectivity, light to heavy">
            <small>light</small>
            <i aria-hidden="true" />
            <small>heavy</small>
          </span>
          <span>
            <b aria-hidden="true" />
            <small>no coverage</small>
          </span>
          <a
            href="https://www.rainviewer.com/"
            target="_blank"
            rel="noreferrer"
          >
            RainViewer
          </a>
        </footer>
      )}
    </section>
  );
}
