/**
 * FloodGuard AI — provisional flood-risk estimation engine.
 *
 * IMPORTANT — This module is a transparent, rules-based heuristic, NOT a
 * validated prediction model or "AI". It converts a handful of weather
 * indicators into an understandable risk category so the dashboard can show
 * something explainable. The score weights and 72-hour accumulation bands are
 * design choices made for this app; they are not calibrated against flood
 * records. The 24-hour rainfall classes reuse the India Meteorological
 * Department (IMD) public rainfall-intensity classification so the vocabulary
 * matches official bulletins.
 *
 * Everything here is pure and dependency-free so it can be unit-tested with
 * `node --test` and reused outside the React app.
 */

export const ENGINE_ID = 'floodguard-rules-engine'
export const ENGINE_VERSION = '0.1.0-provisional'

/** Weather data older than this is considered stale and no score is produced. */
export const STALE_AFTER_MS = 2 * 60 * 60 * 1000

export const RISK_CATEGORIES = ['Low', 'Moderate', 'High', 'Severe']

/**
 * IMD rainfall-intensity classification for 24-hour accumulations (mm).
 * Reference: IMD/NCRWC rainfall categories used in official bulletins —
 * light 0.1–15.9, moderate 16.0–64.4, heavy 64.5–115.5,
 * very heavy 115.6–204.4, extremely heavy >= 204.5.
 * `factor` is the share of a component's weight this class earns (design choice).
 */
export const IMD_RAINFALL_CLASSES = [
  { upperMm: 0.1, label: 'no rain', factor: 0.0 },
  { upperMm: 16, label: 'light rain', factor: 0.15 },
  { upperMm: 64.5, label: 'moderate rain', factor: 0.4 },
  { upperMm: 115.6, label: 'heavy rain', factor: 0.65 },
  { upperMm: 204.5, label: 'very heavy rain', factor: 0.85 },
  { upperMm: Infinity, label: 'extremely heavy rain', factor: 1.0 },
]

/**
 * Provisional bands for antecedent 72-hour accumulation (mm).
 * PROVISIONAL: chosen for this app; no authoritative standard exists for
 * turning a 72-hour total into flood potential on its own.
 */
export const ACCUMULATION_72H_BANDS = [
  { upperMm: 50, label: 'limited recent accumulation', factor: 0.0 },
  { upperMm: 100, label: 'noticeable recent accumulation', factor: 0.3 },
  { upperMm: 150, label: 'high recent accumulation', factor: 0.6 },
  { upperMm: 200, label: 'very high recent accumulation', factor: 0.8 },
  { upperMm: Infinity, label: 'extreme recent accumulation', factor: 1.0 },
]

/** Component weights (must total 100). PROVISIONAL design choices. */
export const COMPONENT_WEIGHTS = {
  observed24h: 45,
  forecast24h: 35,
  accumulation72h: 20,
}

/** Score -> category mapping. PROVISIONAL bands. */
export const CATEGORY_THRESHOLDS = [
  { category: 'Low', minScore: 0 },
  { category: 'Moderate', minScore: 30 },
  { category: 'High', minScore: 60 },
  { category: 'Severe', minScore: 80 },
]

/**
 * Official warning colours raise the estimate to at least the given category.
 * IMD colour meaning: yellow = watch/be updated, orange = alert/be prepared,
 * red = warning/take action. This mapping is a display design choice, not a
 * scientific derivation.
 */
export const WARNING_LEVEL_FLOORS = {
  yellow: 'Moderate',
  orange: 'High',
  red: 'Severe',
}

export const CATEGORY_ORDER = { Low: 0, Moderate: 1, High: 2, Severe: 3 }


/** Safety guidance per final category (general India-focused advice). */
export const SAFETY_GUIDANCE = {
  Low: {
    title: 'Conditions look calm right now',
    actions: [
      'Stay aware of IMD and local authority updates if rain is forecast.',
      'Save emergency numbers (112) and know your nearest safe higher ground.',
      'Avoid driving or walking through waterlogged roads even when shallow.',
    ],
  },
  Moderate: {
    title: 'Be updated and prepared',
    actions: [
      'Follow official IMD bulletins and local authority notices for your district.',
      'Avoid low-lying roads, underpasses and riverbanks during heavy spells.',
      'Keep drains and channels around your home clear of debris.',
      'Move vehicles and valuables away from ground floors if your area floods often.',
    ],
  },
  High: {
    title: 'Be alert — take precautions now',
    actions: [
      'Monitor official warnings from IMD and your district disaster authority.',
      'Shift vehicles, electronics and documents to higher floors.',
      'Avoid all waterlogged roads, underpasses, bridges and riverbanks.',
      'Keep a charged phone, torch, water and basic medicines ready.',
      'Plan an evacuation route to higher ground with your family.',
    ],
  },
  Severe: {
    title: 'Take action — conditions are dangerous',
    actions: [
      'Follow evacuation orders and instructions from local authorities immediately.',
      'Move to higher ground now if you are in a low-lying or riverbank area.',
      'Never walk, swim or drive through floodwater — stay away from drains and culverts.',
      'Call 112 for emergencies; contact your district emergency control room.',
      'Do not wait for this app — rely only on official alerts and authorities.',
    ],
  },
}

export const ENGINE_LIMITATIONS = [
  'This is a provisional, rules-based heuristic — not a validated AI model or flood forecast. The weights and bands have not been calibrated against historical flood records.',
  'It uses only gridded weather-model data (Open-Meteo). It does not know river levels, tide, soil moisture, terrain, drainage capacity, dam operations or urban flooding history.',
  'Rainfall vocabulary follows IMD 24-hour rainfall-intensity classes; the score weights and the 72-hour accumulation bands are design choices made for this app.',
  'A weather-based estimate is not an official warning and never confirms that a flood is happening. Official IMD warnings, when shown, are displayed separately with their source and timestamp.',
  'Point forecasts degrade with lead time and distance; actual rainfall at a specific street can differ notably from the grid value shown here.',
]

/* ---------------------------------------------------------------- helpers */

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

function bandFor(mm, bands) {
  for (const band of bands) {
    if (mm < band.upperMm) return band
  }
  return bands[bands.length - 1]
}

export function categoryForScore(score) {
  let matched = CATEGORY_THRESHOLDS[0].category
  for (const threshold of CATEGORY_THRESHOLDS) {
    if (score >= threshold.minScore) matched = threshold.category
  }
  return matched
}

function highestCategory(a, b) {
  if (!a) return b
  if (!b) return a
  return CATEGORY_ORDER[a] >= CATEGORY_ORDER[b] ? a : b
}

const LEVEL_ORDER = { green: 0, yellow: 1, orange: 2, red: 3 }

export function worstWarningLevel(levels) {
  let worst = null
  for (const level of levels) {
    if (!level || !(level in LEVEL_ORDER)) continue
    if (worst === null || LEVEL_ORDER[level] > LEVEL_ORDER[worst]) worst = level
  }
  return worst
}

function summarizeWarnings(warnings) {
  if (!warnings || warnings.status !== 'ok') {
    return {
      status: !warnings ? 'unavailable' : warnings.status,
      level: null,
      district: null,
      updatedAt: null,
      source: (warnings && warnings.source) || null,
      checkedAt: (warnings && (warnings.checkedAt || warnings.fetchedAt)) || null,
      entries: [],
      note: (warnings && warnings.note) || 'No official warning source could be checked for this location.',
    }
  }

  const level = worstWarningLevel((warnings.entries || []).map((entry) => entry.level))
  const primary = (warnings.entries || [])[0] || null
  return {
    status: 'ok',
    level,
    district: (primary && primary.district) || warnings.district || null,
    updatedAt: warnings.updatedAt || (primary && primary.updatedAt) || null,
    source: warnings.source || null,
    checkedAt: warnings.checkedAt || warnings.fetchedAt || null,
    entries: warnings.entries || [],
    note: warnings.note || null,
  }
}

/* ---------------------------------------------------------------- engine */

/**
 * Evaluate flood risk for one location.
 *
 * @param {object} input
 * @param {object|null} input.weather  Normalized output of weatherService.fetchWeatherForPlace (any status).
 * @param {object|null} input.warnings Normalized output of warningsService.fetchOfficialWarnings (any status).
 * @param {Date|string|number} [input.now] Evaluation time (injectable for tests).
 * @returns {object} assessment — status, score, category, factors, warnings, safety guidance, notes, limitations.
 */
export function assessFloodRisk({ weather, warnings = null, now = null } = {}) {
  const evaluatedAt = now ? new Date(now) : new Date()
  const evaluatedAtMs = evaluatedAt.getTime()
  const notes = []

  const base = {
    provisional: true,
    engine: { id: ENGINE_ID, version: ENGINE_VERSION },
    evaluatedAt: evaluatedAt.toISOString(),
    inputs: null,
    factors: [],
    notes,
    limitations: ENGINE_LIMITATIONS,
    safety: null,
    dataSources: [],
  }

  const warningSummary = summarizeWarnings(warnings)

  /* 1. Live weather must exist at all. */
  if (!weather || weather.status !== 'ok') {
    notes.push(
      !weather
        ? 'No live weather data was provided. Missing live data is never replaced with demo values.'
        : `Live weather data is unavailable (${weather.reason || weather.status}). No risk score is shown without it.`,
    )
    if (warningSummary.status === 'ok') {
      notes.push('Official warnings below are shown as-is and were not converted into a score.')
    }
    return {
      ...base,
      status: 'weather-unavailable',
      score: null,
      category: null,
      weatherCategory: null,
      categorySource: null,
      confidence: null,
      warnings: warningSummary,
      weatherFetchedAt: weather ? weather.fetchedAt || null : null,
      dataSources: warningSummary.status === 'ok' && warningSummary.source ? [warningSummary.source] : [],
    }
  }

  const weatherFetchedAt = weather.fetchedAt || null
  base.weatherFetchedAt = weatherFetchedAt
  if (weather.source) base.dataSources.push(weather.source)

  /* 2. Freshness — stale inputs do not justify a score. */
  const fetchedAtMs = Date.parse(weatherFetchedAt || '')
  if (!Number.isFinite(fetchedAtMs)) {
    notes.push('Weather data has no usable timestamp, so freshness cannot be verified. No score is shown.')
    return {
      ...base,
      status: 'stale',
      score: null,
      category: null,
      weatherCategory: null,
      categorySource: null,
      confidence: null,
      warnings: warningSummary,
    }
  }
  if (evaluatedAtMs - fetchedAtMs > STALE_AFTER_MS) {
    const ageMinutes = Math.round((evaluatedAtMs - fetchedAtMs) / 60000)
    notes.push(`Weather data is stale (fetched about ${ageMinutes} minutes ago). Refresh to get a current estimate.`)
    return {
      ...base,
      status: 'stale',
      score: null,
      category: null,
      weatherCategory: null,
      categorySource: null,
      confidence: null,
      warnings: warningSummary,
    }
  }

  /* 3. Rainfall inputs — at least one primary input is required. */
  const rainfall = weather.rainfall || {}
  const last24hMm = toFiniteNumber(rainfall.last24hMm)
  const next24hMm = toFiniteNumber(rainfall.next24hMm)
  const last72hMm = toFiniteNumber(rainfall.last72hMm)

  base.inputs = {
    observed24hMm: last24hMm,
    forecast24hMm: next24hMm,
    accumulation72hMm: last72hMm,
    observedAt: weather.observedAt || null,
    place: weather.place || null,
    current: weather.current || null,
  }

  if (last24hMm === null && next24hMm === null) {
    notes.push('Neither recent nor forecast rainfall is available, so no risk score is justified.')
    return {
      ...base,
      status: 'insufficient-data',
      score: null,
      category: null,
      weatherCategory: null,
      categorySource: null,
      confidence: null,
      warnings: warningSummary,
    }
  }

  /* 4. Weighted components. */
  const factors = []
  let score = 0

  if (last24hMm !== null) {
    const band = bandFor(last24hMm, IMD_RAINFALL_CLASSES)
    const points = Math.round(band.factor * COMPONENT_WEIGHTS.observed24h)
    score += points
    factors.push({
      key: 'observed-rainfall',
      label: 'Recent rainfall (last 24 h)',
      detail: `${last24hMm.toFixed(1)} mm — IMD class: ${band.label}`,
      points,
      maxPoints: COMPONENT_WEIGHTS.observed24h,
    })
  } else {
    notes.push('Recent 24-hour rainfall is missing; the estimate relies on forecast rain only.')
  }

  if (next24hMm !== null) {
    const band = bandFor(next24hMm, IMD_RAINFALL_CLASSES)
    const points = Math.round(band.factor * COMPONENT_WEIGHTS.forecast24h)
    score += points
    factors.push({
      key: 'forecast-rainfall',
      label: 'Forecast rainfall (next 24 h)',
      detail: `${next24hMm.toFixed(1)} mm — IMD class: ${band.label}`,
      points,
      maxPoints: COMPONENT_WEIGHTS.forecast24h,
    })
  } else {
    notes.push('Forecast 24-hour rainfall is missing; the estimate relies on observed rain only.')
  }

  if (last72hMm !== null) {
    const band = bandFor(last72hMm, ACCUMULATION_72H_BANDS)
    const points = Math.round(band.factor * COMPONENT_WEIGHTS.accumulation72h)
    score += points
    factors.push({
      key: 'accumulation',
      label: 'Wet-ground signal (72 h total)',
      detail: `${last72hMm.toFixed(1)} mm — ${band.label} (provisional band)`,
      points,
      maxPoints: COMPONENT_WEIGHTS.accumulation72h,
    })
  } else {
    notes.push('The 72-hour accumulation is missing, so ground wetness is not counted.')
  }

  score = Math.min(100, score)
  const weatherCategory = categoryForScore(score)
  const confidence = last24hMm !== null && next24hMm !== null && last72hMm !== null ? 'high' : 'medium'

  /* 5. Official warnings: shown separately; they may raise the category. */
  let category = weatherCategory
  let categorySource = 'weather-estimate'
  if (warningSummary.status === 'ok') {
    if (warningSummary.source) base.dataSources.push(warningSummary.source)
    const floor = WARNING_LEVEL_FLOORS[warningSummary.level]
    if (floor) {
      const raised = highestCategory(weatherCategory, floor)
      if (raised !== category) {
        category = raised
        categorySource = 'official-warning-floor'
        notes.push(
          `Category raised from ${weatherCategory} to ${category} because an official IMD ${warningSummary.level} warning is in effect.`,
        )
      }
    } else {
      notes.push('The official IMD colour for this district is green (no warning) for the coming days.')
    }
  } else {
    notes.push(warningSummary.note || 'Official warning source was unavailable; the estimate is weather-only.')
  }

  notes.push('Provisional estimate from a rules-based heuristic — not an official warning and not a confirmed flood event.')

  return {
    ...base,
    status: 'ok',
    score,
    category,
    weatherCategory,
    categorySource,
    confidence,
    factors,
    warnings: warningSummary,
    safety: SAFETY_GUIDANCE[category] || null,
  }
}


