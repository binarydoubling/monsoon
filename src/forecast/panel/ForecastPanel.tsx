import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { AtlasText, Button, Icon, box, paper, sub } from "../../shared/ui";
import { key, seed, temp, type Place } from "../weather";
import MinuteExplorer from "../minutes/MinuteExplorer";
import DailyForecast from "../overview/DailyForecast";
import WeatherArt from "../WeatherArt";
import LocationHeading from "../LocationHeading";
import { useForecast } from "../useForecast";
import ForecastSheetHandle from "./ForecastSheetHandle";

export interface ForecastPanelHandle {
  openOverview(): void;
}

export default function ForecastPanel({
  ref,
  small,
  height,
  panelWidth,
  point,
  fahrenheit,
  selected,
  onToggleSaved,
  onSources,
}: {
  ref: Ref<ForecastPanelHandle>;
  small: boolean;
  height: number;
  panelWidth: number;
  point: Place;
  fahrenheit: boolean;
  selected: boolean;
  onToggleSaved: () => void;
  onSources: () => void;
}) {
  const { data, state, retry } = useForecast(point.lat, point.lon);
  const forecastPanel = useRef<HTMLDivElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const exitAnimation = useRef<Animation | null>(null);

  const openForecast = () => {
    exitAnimation.current?.cancel();
    exitAnimation.current = null;
    setSheetOpen(true);
  };

  const collapseForecast = useCallback(() => {
    const panel = forecastPanel.current;
    if (!panel || exitAnimation.current) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSheetOpen(false);
      return;
    }

    const animation = panel.animate(
      [
        { transform: getComputedStyle(panel).transform },
        { transform: "translateY(100%)" },
      ],
      {
        duration: 240,
        easing: "cubic-bezier(.4, 0, .8, .5)",
        fill: "forwards",
      },
    );

    exitAnimation.current = animation;

    animation.onfinish = () => {
      if (exitAnimation.current === animation) setSheetOpen(false);
    };
  }, []);

  useEffect(() => {
    return () => {
      exitAnimation.current?.cancel();
      exitAnimation.current = null;
    };
  }, [small, sheetOpen]);

  const [panelView, setPanelView] = useState<"overview" | "minutes">(
    "overview",
  );

  useImperativeHandle(ref, () => ({
    openOverview() {
      setPanelView("overview");
      openForecast();
    },
  }));

  const current = data?.current;
  const referenceTime = current?.t ?? Date.now() / 1000;

  const firstHour =
    data?.hours.find((hour) => hour.t + 3600 > referenceTime) ?? data?.hours[0];

  const showMinutes = panelView === "minutes" && !!data && !!firstHour;

  return (
    <>
      {(!small || sheetOpen) && (
        <div
          ref={forecastPanel}
          className={small ? "stack mobile-forecast-sheet" : "stack"}
          aria-label="Forecast panel"
          style={{
            ...box,
            position: "absolute",
            overflow: "hidden",
            backgroundColor: paper,
            ...(small
              ? {
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: height * (showMinutes ? 0.88 : 0.76),
                  borderTopLeftRadius: 17,
                  borderTopRightRadius: 17,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                }
              : { right: 16, top: 82, bottom: 20, width: panelWidth }),
          }}
        >
          {small && (
            <ForecastSheetHandle
              panel={forecastPanel}
              collapse={collapseForecast}
            />
          )}
          <nav className="forecast-views" aria-label="Forecast views">
            <button
              type="button"
              aria-pressed={!showMinutes}
              onClick={() => setPanelView("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              aria-pressed={showMinutes}
              disabled={!firstHour}
              onClick={() => setPanelView("minutes")}
            >
              Minute explorer
            </button>
            <button
              type="button"
              className="save-location"
              onClick={onToggleSaved}
              aria-label={selected ? "Remove saved point" : "Save point"}
              aria-pressed={selected}
            >
              <Icon name={selected ? "check" : "bookmark"} size={16} />
            </button>
          </nav>
          {showMinutes && (
            <MinuteExplorer
              key={key(point) + ":" + firstHour.t}
              hours={data.hours}
              start={firstHour.t}
              initialMinute={Math.max(
                0,
                Math.min(59, Math.floor((referenceTime - firstHour.t) / 60)),
              )}
              zone={data.zone}
              f={fahrenheit}
              point={point}
              saved={data === seed || state === "offline"}
            />
          )}
          <div
            className="stack scroll"
            key={key(point)}
            style={{
              paddingBottom: 12,
              display: showMinutes ? "none" : undefined,
            }}
          >
            {!data && (
              <div className="overview-location">
                <LocationHeading point={point} />
              </div>
            )}
            {!data && (
              <div className="stack" style={{ paddingBlock: 26 }}>
                {state === "loading" ? (
                  <span
                    className="spinner"
                    role="status"
                    aria-label="Loading forecast"
                  />
                ) : (
                  <AtlasText>Forecast unavailable for this point.</AtlasText>
                )}
              </div>
            )}
            {data && !showMinutes && (
              <DailyForecast
                point={point}
                forecast={data}
                fahrenheit={fahrenheit}
                saved={data === seed || state === "offline"}
              />
            )}
            {state === "offline" && (
              <Button onClick={retry}>Retry forecast</Button>
            )}
            <Button onClick={onSources} style={{ paddingBlock: 8 }}>
              <Icon name="info" size={12} />
              <AtlasText size={14} color={sub}>
                Data & map sources
              </AtlasText>
            </Button>
          </div>
        </div>
      )}
      {small && !sheetOpen && (
        <Button
          label="Open forecast"
          className="control forecast-bubble"
          aria-description={
            current
              ? `${point.name}, ${temp(current.c, fahrenheit)}°${fahrenheit ? "F" : "C"}, ${current.desc}`
              : point.name
          }
          onClick={openForecast}
        >
          <span className="bubble-place">{point.name}</span>
          {current && (
            <>
              <WeatherArt desc={current.desc} day={current.day} size={36} />
              <strong>{temp(current.c, fahrenheit)}°</strong>
            </>
          )}
          <Icon name="chevron-up" size={15} />
        </Button>
      )}
    </>
  );
}
