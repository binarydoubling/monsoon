import { useEffect, useRef } from "react";
import {
  Camera,
  Mesh,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";
import { radians, solarElevation, solarPosition } from "./sun";
import type { Coordinates, ForecastHour } from "./weather";

const vertexShader = `
  varying vec2 skyUv;
  void main() {
    skyUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 skyUv;
  uniform vec2 sun;
  uniform float elevation;
  uniform float cover;
  uniform float aspect;
  uniform vec2 drift;
  uniform float rain;
  uniform float elapsed;

  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }

  float noise2(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1., 0.)), f.x),
               mix(hash(cell + vec2(0., 1.)), hash(cell + 1.), f.x), f.y);
  }

  float turbulence(vec2 p) {
    float value = 0.;
    float weight = 0.52;
    const mat2 turn = mat2(0.84, 0.54, -0.54, 0.84);
    for (int i = 0; i < 5; ++i) {
      value += noise2(p) * weight;
      p = turn * p * 2.06 + vec2(3.1, 7.3);
      weight *= 0.49;
    }
    return value;
  }

  float rainLayer(vec2 uv, float scale, float speed) {
    vec2 p = vec2(uv.x * aspect + uv.y * .12, uv.y) * vec2(scale, 5.);
    float lane = floor(p.x);
    p.y += elapsed * speed + hash(vec2(lane, scale)) * 18.;
    vec2 cell = vec2(lane, floor(p.y));
    float center = .18 + .64 * hash(cell);
    float streak = 1. - smoothstep(.015, .085, abs(fract(p.x) - center));
    float tail = 1. - smoothstep(.015, .32, fract(p.y));
    return streak * tail * step(hash(cell + 9.), rain);
  }

  void main() {
    vec2 uv = skyUv;
    float day = smoothstep(-5., 18., elevation);
    float twilight = smoothstep(-16., -2., elevation) * (1. - smoothstep(1., 26., elevation));
    float height = smoothstep(0.10, 1.05, uv.y);
    vec3 zenith = mix(vec3(.022,.031,.081), vec3(.105,.325,.585), day);
    vec3 horizon = mix(vec3(.085,.104,.187), vec3(.66,.805,.875), day);
    horizon = mix(horizon, vec3(.985,.523,.357), twilight * .88);
    zenith += twilight * vec3(.13,.075,.15);
    vec3 sky = mix(horizon, zenith, pow(height, .58));

    vec2 sunVector = (sun - uv) * vec2(aspect, 1.);
    float radius = length(sunVector);
    float sunlight = smoothstep(-1.1, .65, elevation);
    vec3 light = mix(vec3(1., .63, .29), vec3(1., .944, .772), day);
    sky += light * exp(-radius * 4.7) * (.17 * day + .47 * twilight);
    sky = mix(sky, light, sunlight * (.18 * exp(-radius * 23.) +
               .82 * (1. - smoothstep(.021, .025, radius))));

    vec2 stars = uv * vec2(aspect, 1.) * 115.;
    vec2 cell = floor(stars);
    vec2 center = .16 + .68 * vec2(hash(cell + 21.), hash(cell + 83.));
    float star = (1. - smoothstep(.018, .19, length(fract(stars) - center))) * step(.939, hash(cell));
    sky += star * vec3(.74,.82,1.) * (1. - smoothstep(-15., -4., elevation)) * height;

    // Perspective compresses the cloud layers as they approach the horizon.
    float skyHeight = max(.075, uv.y - .1);
    vec2 plane = vec2((uv.x - .56) * aspect, 1.3) / (.42 + skyHeight);
    vec2 p = plane * 2.35 + drift;
    float shape = turbulence(p + .52 * noise2(p * .62));
    float edge = mix(.82, .19, cover);
    float density = smoothstep(edge - .075, edge + .115, shape) * smoothstep(0., .07, cover);
    float facing = turbulence(p + .12 * normalize(sunVector + vec2(.012,.02)));
    float relief = clamp(.57 + (shape - facing) * 4.8 - (shape - edge) * 1.30, 0., 1.);
    vec3 shadow = mix(vec3(.043,.056,.103), vec3(.348,.442,.557), day);
    vec3 bright = mix(vec3(.12,.145,.235), vec3(.96,.966,.944), day);
    bright = mix(bright, vec3(.98,.66,.48), twilight * .8);
    vec3 cloud = mix(shadow, bright, relief);
    cloud += light * sunlight * exp(-radius * 5.) * (1. - density) * .72;
    float cirrus = smoothstep(.55,.72,turbulence(plane * vec2(1.8,8.) + drift * .36));
    sky = mix(sky, bright, cirrus * cover * .28);
    sky = mix(sky, cloud, density * .96);
    float drops = rainLayer(uv, 62., 3.9) + .6 * rainLayer(uv + .27, 97., 2.8);
    sky = mix(sky, vec3(.74,.82,.93), clamp(drops * (.34 + .28 * rain), 0., .82));
    sky += (hash(gl_FragCoord.xy) - .5) / 255.;
    vec3 mantle = vec3(24.,24.,37.) / 255.;
    gl_FragColor = vec4(mix(mantle, sky, smoothstep(0., .36, uv.y)), 1.);
  }
`;

function cloudFraction(hour?: ForecastHour) {
  if (hour?.cloudCover != null)
    return Math.min(1, Math.max(0, hour.cloudCover / 100));

  if (!hour) return 0;
  if (/partly cloudy/i.test(hour.desc)) return 0.44;
  if (/clear/i.test(hour.desc)) return 0.04;
  return 0.86;
}

export default function ForecastSky({
  t,
  point,
  hour,
}: {
  t: number;
  point: Coordinates;
  hour?: ForecastHour;
}) {
  const host = useRef<HTMLDivElement>(null);
  const sun = solarPosition(t * 1000);
  const elevation = solarElevation(sun, point.lon, point.lat);

  const east =
    Math.cos(sun.lat * radians) * Math.sin((sun.lon - point.lon) * radians);

  const sunX = 0.74 - east * 0.2;
  const sunY = 0.33 + 0.61 * Math.sin(elevation * radians);
  const cover = cloudFraction(hour);
  const desc = hour?.desc ?? "";

  const rain = /thunder|heavy rain/i.test(desc)
    ? 0.95
    : /drizzle/i.test(desc)
      ? 0.23
      : /light rain/i.test(desc)
        ? 0.4
        : /rain/i.test(desc)
          ? 0.7
          : 0;

  const wind = Math.min(100, hour?.kmh ?? 8);
  const frame = useRef<() => void>(() => {});
  const state = useRef({ elevation, sunX, sunY, cover, rain, wind, point });

  useEffect(() => {
    state.current = { elevation, sunX, sunY, cover, rain, wind, point };
    frame.current();
  }, [elevation, sunX, sunY, cover, rain, wind, point]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: WebGLRenderer;

    try {
      renderer = new WebGLRenderer({
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    const canvas = renderer.domElement;
    canvas.style.cssText = "display:block;width:100%;height:100%;";
    container.appendChild(canvas);

    const uniforms = {
      sun: { value: new Vector2() },
      elevation: { value: 0 },
      cover: { value: 0 },
      rain: { value: 0 },
      elapsed: { value: 0 },
      aspect: { value: 1 },
      drift: { value: new Vector2() },
    };

    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    const geometry = new PlaneGeometry(2, 2);
    const scene = new Scene();
    scene.add(new Mesh(geometry, material));
    const camera = new Camera();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pending = 0;

    let visible = true;
    let lastDraw: number | undefined;
    let drift = 0;

    function draw(now: number) {
      pending = 0;

      if (!visible || document.hidden) {
        lastDraw = undefined;
        return;
      }

      const elapsed = lastDraw == null ? 0 : now - lastDraw;

      if (!motion.matches && lastDraw != null && elapsed < 40) {
        schedule();
        return;
      }

      const mix =
        lastDraw == null || motion.matches ? 1 : 1 - Math.exp(-elapsed / 180);

      const dt = motion.matches ? 0 : Math.min(elapsed, 100) / 1000;
      lastDraw = now;
      const { elevation, sunX, sunY, cover, rain, wind, point } = state.current;

      const width = canvas.clientWidth,
        height = canvas.clientHeight;

      if (!width || !height || renderer.getContext().isContextLost()) return;
      const scale = Math.min(1.35, window.devicePixelRatio, 900 / width);

      const pixelWidth = Math.round(width * scale);
      const pixelHeight = Math.round(height * scale);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight)
        renderer.setSize(pixelWidth, pixelHeight, false);

      uniforms.aspect.value = width / height;
      uniforms.sun.value.x += (sunX - uniforms.sun.value.x) * mix;
      uniforms.sun.value.y += (sunY - uniforms.sun.value.y) * mix;
      uniforms.elevation.value += (elevation - uniforms.elevation.value) * mix;
      uniforms.cover.value += (cover - uniforms.cover.value) * mix;
      uniforms.rain.value += (rain - uniforms.rain.value) * mix;
      uniforms.elapsed.value += dt;
      drift += dt * (0.025 + wind * 0.0015);

      uniforms.drift.value.set(
        point.lon * 0.073 + drift,
        point.lat * 0.091 + drift * 0.24,
      );

      renderer.render(scene, camera);
      if (!motion.matches) schedule();
    }

    function schedule() {
      if (!pending && !document.hidden && visible)
        pending = window.requestAnimationFrame(draw);
    }

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;

      if (visible) schedule();
      else lastDraw = undefined;
    });

    visibility.observe(container);
    document.addEventListener("visibilitychange", schedule);

    frame.current = schedule;
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    motion.addEventListener("change", schedule);
    canvas.addEventListener("webglcontextrestored", schedule);
    schedule();

    return () => {
      frame.current = () => {};

      window.cancelAnimationFrame(pending);
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener("change", schedule);
      canvas.removeEventListener("webglcontextrestored", schedule);
      material.dispose();
      geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  const fallback =
    elevation < -6 ? "#0b1128" : elevation < 8 ? "#9c6a78" : "#4779a2";

  return (
    <div
      className="forecast-sky"
      aria-hidden="true"
      ref={host}
      style={{ background: `linear-gradient(${fallback}, var(--mantle))` }}
    />
  );
}
