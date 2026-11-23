import { useEffect, useRef } from "react";
import {
  Camera,
  Mesh,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { radians, solarElevation, solarPosition } from "../shared/sun";
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
  uniform vec3 snowFogStorm;
  uniform float stormTime;

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

  float snowLayer(vec2 uv, float scale, float speed, float amount) {
    vec2 p = uv * vec2(aspect, 1.) * scale;
    p.y += elapsed * speed;
    p.x -= elapsed * speed * .22 + .24 * sin(p.y * .42 + elapsed * .65);
    vec2 cell = floor(p);
    vec2 center = .22 + .56 * vec2(hash(cell + scale), hash(cell + 29.));
    float radius = mix(.033, .085, hash(cell + 14.));
    return (1. - smoothstep(radius * .4, radius, length(fract(p) - center)))
         * step(hash(cell + 5.), amount);
  }

  float lightning(vec2 uv, float seed) {
    float y = uv.y;
    float root = mix(.22, .84, hash(vec2(seed, 12.)));
    float bend = noise2(vec2(y * 17., seed)) * .048 + noise2(vec2(y * 51., seed)) * .017;
    float path = root + bend - (1. - y) * .13;
    float trunk = abs(uv.x - path) * aspect;
    float fork = abs(uv.x - path - (.68 - y) * .28) * aspect;
    float bolt = exp(-trunk * 370.) * smoothstep(.22, .36, y);
    bolt += .62 * exp(-fork * 520.) * smoothstep(.46, .53, y) * step(y, .68);
    return bolt * (1. - smoothstep(.86, .98, y));
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
    float fog = snowFogStorm.y;
    if (fog > .002) {
      float bank = turbulence(uv * vec2(aspect * 2.8, 6.) + drift * .7);
      float veil = clamp(.55 + .38 * (1. - uv.y) + (bank - .5) * .6, 0., .96);
      vec3 mist = mix(vec3(.22,.26,.34), vec3(.76,.80,.83), day);
      sky = mix(sky, mist, fog * veil);
    }
    if (snowFogStorm.z > .002) {
      float age = mod(stormTime, 8.);
      float glow = smoothstep(.18,.32,age) * exp(-max(0.,age - .32) * 4.);
      float bolt = lightning(uv, floor(stormTime / 8.) + 1.);
      sky += vec3(.65,.69,.93) * glow * snowFogStorm.z * (.09 * density + bolt);
    }
    if (snowFogStorm.x > .002) {
      float flakes = .60 * snowLayer(uv, 43., 1.6, snowFogStorm.x);
      flakes += snowLayer(uv + .37, 20., 2.5, snowFogStorm.x);
      sky = mix(sky, vec3(.93,.95,1.), clamp(flakes, 0., .95));
    }
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

  const snow = /snow/i.test(desc)
    ? /heavy/i.test(desc)
      ? 0.96
      : /light|grains/i.test(desc)
        ? 0.28
        : 0.65
    : 0;

  const fog = /fog/i.test(desc) ? 1 : 0;
  const storm = /thunder/i.test(desc) ? 1 : 0;

  const wind = Math.min(100, hour?.kmh ?? 8);
  const frame = useRef<() => void>(() => {});

  const state = useRef({
    elevation,
    sunX,
    sunY,
    cover,
    rain,
    snow,
    fog,
    storm,
    wind,
    point,
  });

  useEffect(() => {
    state.current = {
      elevation,
      sunX,
      sunY,
      cover,
      rain,
      snow,
      fog,
      storm,
      wind,
      point,
    };

    frame.current();
  }, [elevation, sunX, sunY, cover, rain, snow, fog, storm, wind, point]);

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
      snowFogStorm: { value: new Vector3() },
      stormTime: { value: 0 },
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

      const {
        elevation,
        sunX,
        sunY,
        cover,
        rain,
        snow,
        fog,
        storm,
        wind,
        point,
      } = state.current;

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
      const effects = uniforms.snowFogStorm.value;
      effects.x += (snow - effects.x) * mix;
      effects.y += (fog - effects.y) * mix;
      effects.z += (storm - effects.z) * mix;

      // Keep a still bolt for reduced motion. Restart the distant strike cycle on storm entry.
      uniforms.stormTime.value = motion.matches
        ? 0.38
        : storm
          ? uniforms.stormTime.value + dt
          : 0;

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
