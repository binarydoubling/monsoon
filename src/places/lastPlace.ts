import type { Place } from "../forecast/weather";

const storageKey = "monsoon:lastPlace";

export function readLastPlace(): Place | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const place = JSON.parse(raw);

    if (
      !Number.isFinite(place?.lat) ||
      Math.abs(place.lat) > 90 ||
      !Number.isFinite(place?.lon) ||
      Math.abs(place.lon) > 180 ||
      typeof place.name !== "string" ||
      typeof place.region !== "string"
    )
      return null;

    return place;
  } catch {
    return null;
  }
}

export function rememberPlace(place: Place, previous?: Place) {
  try {
    // A delayed name lookup must not overwrite a newer selection in another tab.
    if (
      previous &&
      localStorage.getItem(storageKey) !== JSON.stringify(previous)
    )
      return;

    localStorage.setItem(storageKey, JSON.stringify(place));
  } catch {
    // The selection still works when browser storage is unavailable.
  }
}
