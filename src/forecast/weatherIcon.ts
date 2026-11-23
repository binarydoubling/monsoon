// Asset names in the Meteocons fill set.
export function weatherIconName(desc: string, day: boolean) {
  const phase = day ? "day" : "night";

  switch (desc) {
    case "Clear skies":
      return `clear-${phase}`;

    case "Mostly clear":
      return `mostly-clear-${phase}`;

    case "Partly cloudy":
      return `partly-cloudy-${phase}`;

    case "Overcast":
      return `overcast-${phase}`;

    case "Fog":
      return `fog-${phase}`;

    case "Drizzle":
      return "drizzle";

    case "Light rain":

    case "Rain":
      return "rain";

    case "Heavy rain":
      return "extreme-rain";

    case "Rain showers":
      return `partly-cloudy-${phase}-rain`;

    case "Light snow":

    case "Snow":
      return "snow";

    case "Snow grains":
      return "snowflake";

    case "Heavy snow":

    case "Heavy snow showers":
      return "extreme-snow";

    case "Light snow showers":

    case "Snow showers":
      return `partly-cloudy-${phase}-snow`;

    case "Thunderstorms":
      return `thunderstorms-${phase}-rain`;

    default:
      return "not-available";
  }
}
