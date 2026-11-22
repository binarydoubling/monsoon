import type { Map } from "maplibre-gl";
import catalog from "../assets/sky/hipparcos.csv?raw";
import { radians, type Sun } from "./sun";

// Unit vectors in MapLibre's globe axes: east at 90° RA, north, then 0° RA.
function direction(ra: number, dec: number) {
  const equator = Math.cos(dec * radians);

  return {
    x: equator * Math.sin(ra * radians),
    y: Math.sin(dec * radians),
    z: equator * Math.cos(ra * radians),
  };
}

const stars = catalog
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [ra, dec, magnitude, colorIndex] = line.split(",").map(Number);

    const color =
      colorIndex < 0.3 ? "#c9dcff" : colorIndex > 0.95 ? "#ffdfbd" : "#f5f4ee";

    return {
      ...direction(ra, dec),
      color,
      radius: 0.53 + Math.max(0, 6 - magnitude) * 0.2,
      opacity: Math.min(1, 0.24 + Math.pow(10, -0.19 * (magnitude - 3))),
    };
  });

export function drawSpace(canvas: HTMLCanvasElement, map: Map, sun: Sun) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const width = canvas.clientWidth,
    height = canvas.clientHeight;

  const ratio = Math.min(2, map.getPixelRatio());

  if (
    canvas.width !== Math.round(width * ratio) ||
    canvas.height !== Math.round(height * ratio)
  ) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  if (map.getZoom() > 7 && map.getPitch() < 45) return;

  const center = map.getCenter();
  const { x: cx, y: cy } = map.project(center);

  const focal =
    height / (2 * Math.tan((map.getVerticalFieldOfView() * radians) / 2));

  // Points at infinity rotate with the camera but never move closer during a zoom.
  const view = new DOMMatrix()
    .rotateAxisAngle(0, 0, 1, map.getRoll())
    .rotateAxisAngle(1, 0, 0, -map.getPitch())
    .rotateAxisAngle(0, 0, 1, map.getBearing())
    .rotateAxisAngle(1, 0, 0, center.lat)
    .rotateAxisAngle(0, 1, 0, -center.lng - sun.sidereal);

  function project({ x, y, z }: { x: number; y: number; z: number }) {
    const depth = -(view.m13 * x + view.m23 * y + view.m33 * z);
    if (depth <= 0) return;

    return {
      x: cx + (focal * (view.m11 * x + view.m21 * y + view.m31 * z)) / depth,
      y: cy - (focal * (view.m12 * x + view.m22 * y + view.m32 * z)) / depth,
      depth,
    };
  }

  for (const star of stars) {
    const p = project(star);

    if (!p || p.x < -2 || p.x > width + 2 || p.y < -2 || p.y > height + 2)
      continue;

    ctx.globalAlpha = star.opacity;
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, star.radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const p = project(direction(sun.rightAscension, sun.lat));
  if (!p) return;
  const radius = (focal * Math.tan(0.2666 * radians)) / p.depth;
  const halo = radius * 6;

  if (p.x < -halo || p.x > width + halo || p.y < -halo || p.y > height + halo)
    return;

  const glow = ctx.createRadialGradient(p.x, p.y, radius, p.x, p.y, halo);
  glow.addColorStop(0, "rgba(255,244,215,0.64)");
  glow.addColorStop(0.24, "rgba(255,226,175,0.13)");
  glow.addColorStop(1, "rgba(255,221,158,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(p.x - halo, p.y - halo, halo * 2, halo * 2);
  ctx.fillStyle = "#fffdf4";
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
  ctx.fill();
}
