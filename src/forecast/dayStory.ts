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

const directionNames: Record<string, string> = {
  N: "North",
  NE: "Northeast",
  E: "East",
  SE: "Southeast",
  S: "South",
  SW: "Southwest",
  W: "West",
  NW: "Northwest",
};

export function describePeriod(
  hours: ForecastHour[],
  daytime: boolean,
  zone: string,
  fahrenheit: boolean,
) {
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  });

  const time = (hour: ForecastHour) =>
    clock.format(hour.t * 1000).replace(":00", "");

  // Compare the prevailing sky in each half so the wording follows the period in time.
  function prevailing(readings: ForecastHour[]) {
    const counts = new Map<string, number>();

    for (const h of readings) {
      if (h.desc !== "Conditions unavailable")
        counts.set(h.desc, (counts.get(h.desc) ?? 0) + 1);
    }

    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  const middle = Math.ceil(hours.length / 2);
  const secondHalf = hours.slice(middle);
  const early = prevailing(hours.slice(0, middle));
  const late = prevailing(secondHalf);
  let skies = early ?? late;

  if (early && late && late !== early) {
    const change = secondHalf.find((h) => h.desc === late)!;
    skies = early + ", then " + late.toLowerCase() + " by " + time(change);
  }

  const temperatures = hours.map((h) => h.c);

  const extreme = daytime
    ? Math.max(...temperatures)
    : Math.min(...temperatures);

  const degrees = temp(extreme, fahrenheit) + (fahrenheit ? "°F" : "°C");
  const temperature = (daytime ? "high near " : "low near ") + degrees;

  const sentences = [
    skies
      ? skies + ", with a " + temperature + "."
      : (daytime ? "High near " : "Low near ") + degrees + ".",
  ];

  const event =
    hours.find((h) => /thunder/i.test(h.desc)) ??
    hours.find((h) => /rain|snow|drizzle|shower/i.test(h.desc));

  if (event && event.desc !== early && event.desc !== late)
    sentences.push(event.desc + " around " + time(event) + ".");

  const peakWind = hours.reduce<ForecastHour | undefined>(
    (peak, h) => (h.kmh != null && (!peak || h.kmh > peak.kmh!) ? h : peak),
    undefined,
  );

  if (peakWind) {
    const speed = wind(peakWind.kmh, fahrenheit);
    const unit = fahrenheit ? " mph" : " km/h";
    const direction = directionNames[compass(peakWind.dir)];

    const steadyDirection =
      direction &&
      hours.every(
        (h) =>
          h.kmh == null ||
          h.kmh === 0 ||
          compass(h.dir) === compass(peakWind.dir),
      );

    if (speed === 0) sentences.push("Calm winds.");
    else if (steadyDirection) {
      const steadySpeed = hours.every(
        (h) => h.kmh == null || wind(h.kmh, fahrenheit) === speed,
      );

      sentences.push(
        direction +
          " wind " +
          (steadySpeed ? "around " : "up to ") +
          speed +
          unit +
          ".",
      );
    } else {
      sentences.push(
        "Winds reach " +
          speed +
          unit +
          (direction ? " from the " + direction.toLowerCase() : "") +
          " around " +
          time(peakWind) +
          ".",
      );
    }
  }

  const chances = hours.flatMap((h) => (h.rain == null ? [] : [h.rain]));
  const chance = Math.max(...chances);

  if (chance >= 20) {
    const wetHours = hours.filter((h) =>
      /rain|snow|drizzle|thunder/i.test(h.desc),
    );

    // The model gives an all-precipitation probability; only name a type when the wet hours agree.
    const type = ["snow", "rain", "drizzle"].find(
      (type) =>
        wetHours.some((h) => h.rain === chance) &&
        wetHours.every((h) => h.desc.toLowerCase().includes(type)),
    );

    sentences.push(
      "Chance of " +
        (type ?? "precipitation") +
        " reaches " +
        Math.round(chance) +
        "%.",
    );
  }

  return {
    desc: event?.desc ?? early ?? late ?? "Conditions unavailable",
    text: sentences.join(" "),
    time:
      hours.length === 1
        ? time(hours[0])
        : time(hours[0]) + " – " + time(hours.at(-1)!),
  };
}
