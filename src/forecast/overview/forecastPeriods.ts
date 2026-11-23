import type { Forecast, ForecastDay, ForecastHour } from "../weather";

type PeriodName = "Day" | "Night" | "Overnight";

interface ForecastPeriod {
  name: PeriodName;
  hours: ForecastHour[];
}

interface OutlookDate {
  date: string;
  daily?: ForecastDay;
  periods: ForecastPeriod[];
}

export function forecastPeriods(
  forecast: Forecast,
  reference = forecast.current?.t ?? forecast.hours[0]?.t,
): OutlookDate[] {
  const { hours, daily, zone } = forecast;

  const calendar = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "numeric",
    hourCycle: "h23",
  });

  const today =
    reference == null ? daily[0]?.date : calendar.format(reference * 1000);

  const thisHour =
    reference == null ? 0 : Number(clock.format(reference * 1000));

  const dates = new Map<string, OutlookDate>();

  function addDate(date: string, daily?: ForecastDay) {
    const periods: ForecastPeriod[] = [];

    if (date === today && thisHour < 6)
      periods.push({ name: "Overnight", hours: [] });

    if (date !== today || thisHour < 18)
      periods.push({ name: "Day", hours: [] });

    periods.push({ name: "Night", hours: [] });
    const entry = { date, daily, periods };
    dates.set(date, entry);
    return entry;
  }

  for (const entry of daily) {
    if (!today || entry.date >= today) addDate(entry.date, entry);
  }

  for (const hour of hours) {
    // Retain the hourly sample containing the forecast's current timestamp.
    if (reference != null && hour.t + 3600 <= reference) continue;
    const ms = hour.t * 1000;
    const hourOfDay = Number(clock.format(ms));
    let date = calendar.format(ms);
    let period: PeriodName = "Day";

    if (hourOfDay < 6 && date === today) {
      period = "Overnight";
    } else if (hourOfDay < 6) {
      // Subtract a civil date, not 24 elapsed hours across a DST change.
      date = new Date(Date.parse(date + "T00:00Z") - 86400000)
        .toISOString()
        .slice(0, 10);

      period = "Night";
    } else if (hourOfDay >= 18) {
      period = "Night";
    }

    if (today && date < today) continue;
    const entry = dates.get(date) ?? addDate(date);
    entry.periods.find((p) => p.name === period)?.hours.push(hour);
  }

  return [...dates.values()].sort((a, b) => a.date.localeCompare(b.date));
}
