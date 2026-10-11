/**
 * Official flood/weather warning service for FloodGuard AI.
 *
 * Source: India Meteorological Department (IMD) — the official national
 * weather agency. District-wise colour warnings are published as a public
 * GIS layer on IMD's GeoServer:
 *   https://reactjs.imd.gov.in/geoserver/imd/wfs (layer: imd:district_warnings_india)
 * The colour codes were verified against IMD's own WMS legend:
 *   1 = Red (warning / take action), 2 = Orange (alert / be prepared),
 *   3 = Yellow (watch / be updated), 4 = Green (no warning).
 *
 * CORS NOTE: IMD's servers do not send cross-origin (CORS) headers, so a
 * browser cannot read them directly from another origin. This service first
 * tries a same-origin proxy path (`/imd-warnings`, provided for dev/preview
 * by vite.config.js) and then an optional `VITE_WARNINGS_API_URL` endpoint.
 * If neither works it returns an explicit `unavailable` status — it NEVER
 * fabricates warnings.
 */

export const IMD_WARNING_SOURCE = {
  name: 'India Meteorological Department (IMD)',
  url: 'https://mausam.imd.gov.in/responsive/subDivisionWiseWarningGIS.php',
  note: 'Official district-wise colour warnings published by IMD (national weather agency of India).',
}

/** Same-origin proxy path (see vite.config.js server/preview proxy). */
const PROXY_PATH = '/imd-warnings'
const DEFAULT_TIMEOUT_MS = 8000

/** Verified against IMD WMS legend for layer imd:district_warnings_india. */
export const IMD_LEVEL_BY_CODE = { 1: 'red', 2: 'orange', 3: 'yellow', 4: 'green' }

export const IMD_LEVEL_LABELS = {
  red: 'Red warning — take action',
  orange: 'Orange alert — be prepared',
  yellow: 'Yellow watch — be updated',
  green: 'No warning',
}

const DAY_KEYS = [
  { color: 'Day1_Color', text: 'Day1_text', offset: 0 },
  { color: 'Day2_Color', text: 'Day2_text', offset: 1 },
  { color: 'Day3_Color', text: 'Day3_text', offset: 2 },
  { color: 'Day4_Color', text: 'Day4_text', offset: 3 },
  { color: 'Day5_Color', text: 'Day5_text', offset: 4 },
]

/** Ray-casting point-in-polygon over a single ring. */
function ringContains(ring, lat, lon) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function geometryContains(geometry, lat, lon) {
  if (!geometry) return false
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates || []
  for (const polygon of polygons) {
    if (Array.isArray(polygon) && polygon[0] && ringContains(polygon[0], lat, lon)) return true
  }
  return false
}

function dayLabel(offset) {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  return `Day +${offset}`
}

function dateOffset(baseDate, offset) {
  if (!baseDate) return null
  const date = new Date(`${baseDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

/**
 * Normalize IMD WFS GeoJSON into app warning entries.
 * Picks the district polygon that contains the point (or the first
 * intersecting one as an approximation), then reads its per-day colour codes.
 */
export function normalizeImdWarningFeatures(geoJson, { lat, lon } = {}) {
  const features = (geoJson && Array.isArray(geoJson.features) ? geoJson.features : []).filter(
    (feature) => feature && feature.properties && feature.properties.District,
  )
  if (features.length === 0) return { entries: [], approximate: false }

  let chosen = null
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    chosen = features.find((feature) => geometryContains(feature.geometry, lat, lon)) || null
  }
  const approximate = !chosen
  if (!chosen) chosen = features[0]

  const props = chosen.properties
  const entries = DAY_KEYS.map((day) => {
    const level = IMD_LEVEL_BY_CODE[Number(props[day.color])]
    return {
      district: props.District,
      state: props.state || null,
      level: level || null,
      label: dayLabel(day.offset),
      date: dateOffset(props.Date, day.offset),
      detail: (props[day.text] || '').trim() || null,
      updatedAt: props.updated_at || null,
    }
  }).filter((entry) => entry.level && entry.level !== 'green')

  return {
    entries,
    approximate,
    district: props.District,
    state: props.state || null,
    updatedAt: props.updated_at || null,
  }
}

/* ------------------------------------------------------------- public API */

function warningsUrl(base, lat, lon) {
  const pad = 0.35 // ~40 km window, catches the district containing the point
  const bbox = [lon - pad, lat - pad, lon + pad, lat + pad].map((v) => v.toFixed(4)).join(',')
  const query = [
    'service=WFS',
    'version=1.0.0',
    'request=GetFeature',
    'typeName=imd%3Adistrict_warnings_india',
    'outputFormat=application%2Fjson',
    `bbox=${bbox}`,
    'EPSG:4326',
    'maxFeatures=12',
  ].join('&')
  if (base === PROXY_PATH || /^https?:\/\//.test(base)) return `${base}?${query}`
  return `${PROXY_PATH}?${query}`
}

/**
 * Fetch official IMD district warnings for a coordinate.
 *
 * @param {object} input `{ lat, lon, timeoutMs? }`
 * @returns {object} `{ status: 'ok', level, district, updatedAt, checkedAt,
 *   entries, source }` or `{ status: 'unavailable' | 'error', reason,
 *   checkedAt, source }`. Never fabricates warnings.
 */
export async function fetchOfficialWarnings({ lat, lon, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const checkedAt = new Date().toISOString()
  const source = IMD_WARNING_SOURCE

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      status: 'unavailable',
      reason: 'No coordinates were available, so official district warnings could not be looked up.',
      checkedAt,
      source,
      entries: [],
    }
  }

  const envBase = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WARNINGS_API_URL
  const bases = [envBase, PROXY_PATH].filter(Boolean)

  let lastReason = 'No official warning endpoint is reachable from this deployment.'
  for (const base of bases) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(warningsUrl(base, lat, lon), { signal: controller.signal })
      if (!response.ok) {
        lastReason = `The official warning source responded with HTTP ${response.status}.`
        continue
      }
      const normalized = normalizeImdWarningFeatures(await response.json(), { lat, lon })
      return {
        status: 'ok',
        level: normalized.entries[0] ? normalized.entries[0].level : 'green',
        district: normalized.district || null,
        state: normalized.state || null,
        updatedAt: normalized.updatedAt || null,
        approximate: normalized.approximate,
        entries: normalized.entries,
        checkedAt,
        source,
        note: normalized.approximate
          ? 'Matched to the nearest warning district polygon; boundaries may not align exactly.'
          : null,
      }
    } catch (error) {
      lastReason =
        error && error.name === 'AbortError'
          ? 'The official warning source did not respond in time.'
          : 'The official warning source could not be reached from this browser (IMD servers do not allow cross-origin requests and no proxy is configured).'
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    status: 'unavailable',
    reason: lastReason,
    checkedAt,
    source,
    entries: [],
  }
}


