import React from "react";
import {
  Activity,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  Info,
  MapPin,
  Search,
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
  "external-link": ExternalLink,
  info: Info,
  "map-pin": MapPin,
  search: Search,
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
