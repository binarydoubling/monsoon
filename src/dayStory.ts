import { compass, temp, wind, type ForecastHour } from "./weather";

export function describeDay(
  hours: ForecastHour[],
  zone: string,
  fahrenheit: boolean,
) {
  if (!hours.length) return "Hourly readings are unavailable for this day.";

  const hourOfDay = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    hourCycle: "h23",
  });

  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  });

  const time = (h: ForecastHour) => clock.format(h.t * 1000);

  const parts = [
    "overnight",
    "in the morning",
    "in the afternoon",
    "in the evening",
  ];

  const counts = parts.map(() => new Map<string, number>());

  for (const h of hours) {
    if (h.desc === "Conditions unavailable") continue;
    const part = counts[Math.floor(Number(hourOfDay.format(h.t * 1000)) / 6)];
    part.set(h.desc, (part.get(h.desc) ?? 0) + 1);
  }

  const periods = counts.flatMap((part, i) => {
    const dominant = [...part].sort((a, b) => b[1] - a[1])[0];

    return dominant
      ? [{ desc: dominant[0].toLowerCase(), when: parts[i] }]
      : [];
  });

  const changes = periods.filter(
    (p, i) => !i || p.desc !== periods[i - 1].desc,
  );

  const sentences: string[] = [];

  if (changes.length) {
    const sky =
      changes.length === 1 && periods.length > 1
        ? "Expect " + changes[0].desc + " through most of the day"
        : changes.map((p) => p.desc + " " + p.when).join(", then ");

    sentences.push(sky[0].toUpperCase() + sky.slice(1) + ".");
  }

  const low = hours.reduce((a, b) => (b.c < a.c ? b : a));
  const high = hours.reduce((a, b) => (b.c > a.c ? b : a));

  const degree = (h: ForecastHour) =>
    temp(h.c, fahrenheit) + (fahrenheit ? "°F" : "°C");

  if (degree(low) === degree(high))
    sentences.push("Temperatures stay near " + degree(low) + ".");
  else
    sentences.push(
      "The low is " +
        degree(low) +
        " at " +
        time(low) +
        ", with a high of " +
        degree(high) +
        " at " +
        time(high) +
        ".",
    );

  // Highlight a sustained wet spell even if dry conditions dominate that part of the day.
  let wetStart = 0;
  let wetSpell: { first: ForecastHour; last: ForecastHour } | undefined;

  for (const [i, h] of hours.entries()) {
    if (!/rain|snow|drizzle|shower|thunder/i.test(h.desc)) {
      wetStart = i + 1;
      continue;
    }

    if (i && h.t - hours[i - 1].t !== 3600) wetStart = i;

    if (
      !wetSpell ||
      h.t - hours[wetStart].t > wetSpell.last.t - wetSpell.first.t
    )
      wetSpell = { first: hours[wetStart], last: h };
  }

  if (
    wetSpell &&
    !changes.some((p) => /rain|snow|drizzle|shower|thunder/i.test(p.desc))
  ) {
    const { first, last } = wetSpell;

    sentences.push(
      first.desc +
        (first === last
          ? " around " + time(first)
          : " in the readings from " + time(first) + " to " + time(last)) +
        ".",
    );
  }

  const chances = hours.filter((h) => h.rain != null);

  const peak = chances.reduce<ForecastHour | undefined>(
    (best, h) => (!best || h.rain! > best.rain! ? h : best),
    undefined,
  );

  if (peak?.rain != null) {
    const chance = Math.round(peak.rain) + "%";

    sentences.push(
      chances.every((h) => h.rain === peak.rain)
        ? "Precipitation chances hold at " + chance + "."
        : "The chance of precipitation peaks at " +
            chance +
            " around " +
            time(peak) +
            ".",
    );
  }

  const strongest = hours
    .filter((h) => h.kmh != null)
    .sort((a, b) => b.kmh! - a.kmh!)[0];

  if (strongest) {
    const speed = wind(strongest.kmh, fahrenheit);
    const direction = compass(strongest.dir);

    sentences.push(
      speed === 0
        ? "Winds are calm."
        : "Winds peak at " +
            speed +
            (fahrenheit ? " mph" : " km/h") +
            (direction ? " from the " + direction : "") +
            " around " +
            time(strongest) +
            ".",
    );
  }

  return sentences.join(" ");
}
