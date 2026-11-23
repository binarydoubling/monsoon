import React from "react";
import {
  Activity,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Droplet,
  ExternalLink,
  Info,
  MapPin,
  Search,
  Thermometer,
  Umbrella,
  Wind,
  X,
} from "lucide-react";

export const ink = "var(--text)",
  sub = "var(--subtext0)",
  line = "var(--surface1)",
  paper = "var(--mantle)",
  card = "var(--base)",
  accent = "var(--mauve)";

export const row = { flexDirection: "row", alignItems: "center" } as const;

export const box = {
  borderColor: line,
  borderWidth: 1,
  borderRadius: 8,
  backgroundColor: card,
};

export function AtlasText({
  children,
  size = 15,
  color = ink,
  face = "sans",
  style,
  numberOfLines,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  numberOfLines?: number;
  size?: number;
  color?: string;
  face?: "sans" | "display" | "mono" | "bold";
}) {
  return (
    <span
      {...props}
      className={"text " + face}
      style={{
        fontSize: size,
        color,
        ...(numberOfLines
          ? ({
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: numberOfLines,
              overflow: "hidden",
            } as const)
          : {}),
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Label({
  children,
  color = sub,
}: React.PropsWithChildren<{ color?: string }>) {
  return (
    <AtlasText
      face="mono"
      size={10}
      color={color}
      style={{ letterSpacing: 1.4 }}
    >
      {children}
    </AtlasText>
  );
}

const icons = {
  activity: Activity,
  bookmark: Bookmark,
  check: Check,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  clock: Clock,
  droplet: Droplet,
  "external-link": ExternalLink,
  info: Info,
  "map-pin": MapPin,
  search: Search,
  thermometer: Thermometer,
  umbrella: Umbrella,
  wind: Wind,
  x: X,
};

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 17,
  color = ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const Glyph = icons[name];
  return <Glyph size={size} color={color} aria-hidden="true" />;
}

export function Button({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) {
  return (
    <button type="button" className="control" aria-label={label} {...props}>
      {children}
    </button>
  );
}

export function Logo() {
  return (
    <svg width={37} height={37} viewBox="0 0 40 40">
      <defs>
        <clipPath id="round">
          <circle cx="20" cy="20" r="18" />
        </clipPath>
      </defs>
      <circle cx="20" cy="20" r="18" fill={accent} />
      <g clipPath="url(#round)" fill="none" stroke={paper} strokeWidth="1.6">
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={i}
            d={
              "M -6 " +
              (i * 4 - 3) +
              " C 6 " +
              (i * 4 + 8) +
              " 12 " +
              (i * 4 + 8) +
              " 20 " +
              i * 4 +
              " S 32 " +
              (i * 4 - 6) +
              " 46 " +
              (i * 4 + 1)
            }
          />
        ))}
      </g>
    </svg>
  );
}

export function WeatherArt({ desc = "", day = true, size = 70 }) {
  const wet = /rain|drizzle|shower|thunder/i.test(desc),
    snowy = /snow|sleet/i.test(desc),
    clear = /clear|sunny|fair/i.test(desc),
    partial = /partly|mostly clear|mostly sunny/i.test(desc);

  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 90 72">
      {(clear || partial) && (
        <g>
          {day ? (
            <g fill="var(--yellow)" stroke="var(--peach)" strokeWidth="1.8">
              <circle cx={clear ? 44 : 59} cy={clear ? 35 : 25} r="13" />
              {Array.from({ length: 10 }, (_, i) => (
                <line
                  key={i}
                  x1={clear ? 44 : 59}
                  x2={clear ? 44 : 59}
                  y1={clear ? 11 : 3}
                  y2={clear ? 16 : 7}
                  transform={
                    "rotate(" +
                    i * 36 +
                    " " +
                    (clear ? 44 : 59) +
                    " " +
                    (clear ? 35 : 25) +
                    ")"
                  }
                />
              ))}
            </g>
          ) : (
            <path
              d="M57 8 Q39 16 50 32 Q58 42 69 34 Q55 55 37 43 Q18 28 34 13 Q44 6 57 8Z"
              fill="var(--lavender)"
              stroke="var(--mauve)"
              strokeWidth="1.4"
            />
          )}
        </g>
      )}
      {(!clear || partial) && (
        <g stroke="var(--subtext0)" strokeWidth="1.5">
          <path
            d="M21 46 C8 46 9 30 21 28 C20 16 34 12 43 20 C52 8 70 17 68 29 C83 30 85 46 71 47Z"
            fill="var(--overlay1)"
          />
          <path
            d="M12 51 C2 49 5 38 14 37 C16 26 30 24 36 33 C45 25 58 30 59 40 C72 39 75 52 62 52Z"
            fill="var(--text)"
          />
        </g>
      )}
      {/fog/i.test(desc) && (
        <path
          d="M13 53h48 M23 59h53 M10 65h42"
          fill="none"
          stroke="var(--subtext0)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {/thunder/i.test(desc) && (
        <path
          d="M47 40 34 57h8l-4 13 17-21h-9l6-9z"
          fill="var(--yellow)"
          stroke="var(--mantle)"
          strokeWidth="1.3"
        />
      )}
      {(wet || snowy) &&
        [21, 33, 45, 57].map((x, i) =>
          snowy ? (
            <circle
              key={x}
              cx={x}
              cy={58 + (i % 2) * 3}
              r="2"
              fill="var(--lavender)"
            />
          ) : (
            <line
              key={x}
              x1={x}
              x2={x - 3}
              y1={57 + (i % 2) * 2}
              y2={63 + (i % 2) * 2}
              stroke="var(--blue)"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
          ),
        )}
    </svg>
  );
}
