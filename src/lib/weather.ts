export type Weather = {
  emoji: string;
  label: string;
};

const KEY = "somr-weather";
const TTL_MS = 30 * 60 * 1000;

type Cached = {
  weather: Weather;
  ts: number;
};

export const WEATHER_FALLBACK: Weather = { emoji: "🌤️", label: "Mild" };

export function weatherFromCode(code: number): Weather {
  if (code === 0) return { emoji: "☀️", label: "Sunny" };
  if (code === 1) return { emoji: "🌤️", label: "Mostly Sunny" };
  if (code === 2) return { emoji: "⛅", label: "Partly Cloudy" };
  if (code === 3) return { emoji: "☁️", label: "Cloudy" };
  if (code >= 45 && code <= 48) return { emoji: "🌫️", label: "Foggy" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "Rainy" };
  if (code >= 71 && code <= 77) return { emoji: "🌨️", label: "Snowy" };
  if (code >= 80 && code <= 86) return { emoji: "🌧️", label: "Showers" };
  if (code >= 95) return { emoji: "⛈️", label: "Thunderstorm" };
  return WEATHER_FALLBACK;
}

export function getCachedWeather(): Weather | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed.weather;
  } catch {
    return null;
  }
}

function setCachedWeather(weather: Weather): void {
  if (typeof window === "undefined") return;
  const cached: Cached = { weather, ts: Date.now() };
  window.localStorage.setItem(KEY, JSON.stringify(cached));
}

export async function fetchWeatherAt(
  lat: number,
  lon: number,
): Promise<Weather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const res = await fetch(url);
    const data = await res.json();
    const code = data?.current_weather?.weathercode;
    if (typeof code === "number") {
      const weather = weatherFromCode(code);
      setCachedWeather(weather);
      return weather;
    }
  } catch {
    // ignore
  }
  return null;
}
