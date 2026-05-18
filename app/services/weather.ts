export interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number;
}

function windDirectionLabel(degrees: number): string {
  const dirs = ["N", "NO", "O", "SO", "S", "SV", "V", "NV"];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

export function formatWeather(w: WeatherData): string {
  return `${w.temperature.toFixed(1)}°C, vind ${w.windSpeed.toFixed(1)} m/s ${windDirectionLabel(w.windDirection)}`;
}

export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Europe/Stockholm`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      temperature: data.current.temperature_2m,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
    };
  } catch {
    return null;
  }
}
