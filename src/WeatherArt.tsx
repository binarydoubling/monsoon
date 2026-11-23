import { useId, useMemo, useSyncExternalStore } from "react";
import { weatherIconName } from "./weatherIcon";

const artwork = import.meta.glob<string>("../assets/meteocons/*/*.svg", {
  eager: true,
  import: "default",
  query: "?raw",
});

const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

function subscribeMotion(notify: () => void) {
  motion.addEventListener("change", notify);
  return () => motion.removeEventListener("change", notify);
}

const prefersReducedMotion = () => motion.matches;

export default function WeatherArt({
  desc,
  day = true,
  size = 26,
  x,
  y,
}: {
  desc: string;
  day?: boolean;
  size?: number;
  x?: number;
  y?: number;
}) {
  const still = useSyncExternalStore(subscribeMotion, prefersReducedMotion);
  const variant = still ? "static" : "animated";
  const icon = weatherIconName(desc, day);

  const id = useId();
  const svg = artwork[`../assets/meteocons/${variant}/${icon}.svg`];

  // Inline trusted, bundled artwork. Each instance needs its own gradient and clip IDs.
  const markup = useMemo(
    () => ({
      __html: svg
        .replaceAll(' id="', ` id="${id}-`)
        .replaceAll("url(#", `url(#${id}-`),
    }),
    [svg, id],
  );

  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={markup}
    />
  );
}
