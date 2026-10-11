/**
 * Live weather service for FloodGuard AI.
 *
 * Source: Open-Meteo (https://open-meteo.com/) — free, no API key,
 * CORS-enabled (`access-control-allow-origin: *`, verified). Data is a
 * blend of numerical weather models / reanalysis, NOT rain-gauge
 * observations; treat values as indicative.
 *
 * This service NEVER invents or substitutes demo values. Every failure path
 * returns a structured `{ status: 'error' | 'unavailable', reason, ... }`
 * object so the UI can explain exactly what went wrong.
 */

export const WEATHER_SOURCE = {
  name: 'Open-Meteo',
  url: 'https://open-meteo.com/',
  note: 'Free forecast API (no key). Gridded model data, not station observations.',
}

const GEOCODER_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const DEFAULT_TIMEOUT_MS = 10000

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[()'’.,-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      return { ok: false, reason: `The weather service responded with HTTP ${response.status}.` }
    }
    return { ok: true, data: await response.json() }
  } catch (error) {
    const reason = error && error.name === 'AbortError'
      ? 'The weather service did not respond in time.'
      : 'The weather service could not be reached (network or browser connection issue).'
    return { ok: false, reason, error }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolve an Indian place name (+ optional state) to coordinates using the
 * Open-Meteo geocoder restricted to India.
 */
export async function geocodePlace({ name, state = null, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const query = normalizeName(name)
  if (!query) return { status: 'error', reason: 'No place name was provided for geocoding.' }

  const url = `${GEOCODER_URL}?name=${encodeURIComponent(query)}&count=10&language=en&format=json&countryCode=IN`
  const result = await fetchJson(url, timeoutMs)
  if (!result.ok) return { status: 'error', reason: `Could not geocode "${name}" — ${result.reason}` }

  const results = Array.isArray(result.data && result.data.results) ? result.data.results : []
  if (results.length === 0) {
    return { status: 'error', reason: `No geocoding match found in India for "${name}".` }
  }

  const wantedState = normalizeName(state)
  let best = results.find((entry) => wantedState && normalizeName(entry.admin1) === wantedState)
  if (!best) {
    best = results.find((entry) => normalizeName(entry.name) === query) || results[0]
  }

  return {
    status: 'ok',
    place: {
      name: best.name,
      state: best.admin1 || state || null,
      country: best.country || 'India',
      lat: best.latitude,
      lon: best.longitude,
      timezone: best.timezone || null,
      label: best.admin1 ? `${best.name}, ${best.admin1}` : best.name,
    },
  }
}

/* ------------------------------------------------- hourly series helpers */

function round1(value) {
  return Math.round(value * 10) / 10
}

function sumRange(values, from, to) {
  let total = 0
  let count = 0
  for (let i = from; i <= to && i < values.length; i += 1) {
    if (i < 0) continue
    const value = Number(values[i])
    if (!Number.isFinite(value)) continue
    total += value
    count += 1
  }
  return count > 0 ? round1(total) : null
}

function maxRange(values, from, to) {
  let max = null
  for (let i = from; i <= to && i < values.length; i += 1) {
    if (i < 0) continue
    const value = Number(values[i])
    if (!Number.isFinite(value)) continue
    if (max === null || value > max) max = value
  }
  return max === null ? null : round1(max)
}

/** Index of the slot closest to (but not after) the current time string. */
function currentIndex(times, currentTime) {
  if (!Array.isArray(times) || !currentTime) return null
  const exact = times.indexOf(currentTime)
  if (exact >= 0) return exact
  let found = null
  for (let i = 0; i < times.length; i += 1) {
    if (String(times[i]) <= currentTime) found = i
    else break
  }
  return found
}

/** Build rolling past/future precipitation windows from the hourly series. */
export function computeRainfallWindows(hourly, currentTime) {
  const times = (hourly && hourly.time) || []
  const precip = (hourly && hourly.precipitation) || []
  const probability = (hourly && hourly.precipitation_probability) || []
  const idx = currentIndex(times, currentTime)
  if (idx === null) {
    return {
      last24hMm: null, last48hMm: null, last72hMm: null,
      next24hMm: null, next48hMm: null, next72hMm: null,
      maxHourlyNext24hMm: null, rainProbabilityNext24hPct: null,
    }
  }
  return {
    last24hMm: sumRange(precip, idx - 24, idx - 1),
    last48hMm: sumRange(precip, idx - 48, idx - 1),
    last72hMm: sumRange(precip, idx - 72, idx - 1),
    next24hMm: sumRange(precip, idx, idx + 23),
    next48hMm: sumRange(precip, idx, idx + 47),
    next72hMm: sumRange(precip, idx, idx + 71),
    maxHourlyNext24hMm: maxRange(precip, idx, idx + 23),
    rainProbabilityNext24hPct: maxRange(probability, idx, idx + 23),
  }
}

function buildDailyForecast(daily) {
  if (!daily || !Array.isArray(daily.time)) return []
  const today = new Date().toISOString().slice(0, 10)
  const rows = []
  for (let i = 0; i < daily.time.length && rows.length < 3; i += 1) {
    if (String(daily.time[i]) < today) continue
    const mm = Number(daily.precipitation_sum && daily.precipitation_sum[i])
    const prob = Number(daily.precipitation_probability_max && daily.precipitation_probability_max[i])
    rows.push({
      date: String(daily.time[i]),
      precipitationMm: Number.isFinite(mm) ? round1(mm) : null,
      probabilityPct: Number.isFinite(prob) ? prob : null,
    })
  }
  return rows
}

/* ------------------------------------------------------------- public API */

/**
 * Fetch normalized live weather for a place.
 *
 * @param {object} target  `{ name, state?, lat?, lon? }`. When lat/lon are
 *   missing the place is geocoded first with the Open-Meteo geocoder.
 * @returns {object} `{ status: 'ok', fetchedAt, observedAt, place, current,
 *   rainfall, forecast, source }` on success, or `{ status: 'error', reason,
 *   fetchedAt, source }` on any failure. Never returns demo data.
 */
export async function fetchWeatherForPlace(target = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const fetchedAt = new Date().toISOString()

  try {
    let place
    if (Number.isFinite(target.lat) && Number.isFinite(target.lon)) {
      place = {
        name: target.name || 'Selected location',
        state: target.state || null,
        country: 'India',
        lat: target.lat,
        lon: target.lon,
        timezone: null,
        label: target.state ? `${target.name}, ${target.state}` : target.name,
      }
    } else {
      const geo = await geocodePlace({ name: target.name, state: target.state, timeoutMs })
      if (geo.status !== 'ok') {
        return { status: 'error', reason: geo.reason, fetchedAt, source: WEATHER_SOURCE }
      }
      place = geo.place
    }

    const params = new URLSearchParams({
      latitude: String(place.lat),
      longitude: String(place.lon),
      current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
      hourly: 'precipitation,precipitation_probability',
      daily: 'precipitation_sum,precipitation_probability_max',
      past_days: '3',
      forecast_days: '3',
      timezone: 'auto',
    })
    const result = await fetchJson(`${FORECAST_URL}?${params.toString()}`, timeoutMs)
    if (!result.ok) {
      return { status: 'error', reason: result.reason, fetchedAt, source: WEATHER_SOURCE, place }
    }

    const data = result.data || {}
    const current = data.current || {}
    const rainfall = computeRainfallWindows(data.hourly, current.time)

    return {
      status: 'ok',
      fetchedAt,
      observedAt: current.time || null,
      place: { ...place, timezone: data.timezone || place.timezone },
      current: {
        temperatureC: Number.isFinite(Number(current.temperature_2m)) ? Number(current.temperature_2m) : null,
        humidityPct: Number.isFinite(Number(current.relative_humidity_2m)) ? Number(current.relative_humidity_2m) : null,
        precipitationMm: Number.isFinite(Number(current.precipitation)) ? Number(current.precipitation) : null,
        windKmh: Number.isFinite(Number(current.wind_speed_10m)) ? Number(current.wind_speed_10m) : null,
      },
      rainfall,
      forecast: { daily: buildDailyForecast(data.daily) },
      source: WEATHER_SOURCE,
    }
  } catch (error) {
    console.error('Live weather lookup failed.', error)
    return {
      status: 'error',
      reason: 'An unexpected error occurred while fetching live weather.',
      fetchedAt,
      source: WEATHER_SOURCE,
    }
  }
}


