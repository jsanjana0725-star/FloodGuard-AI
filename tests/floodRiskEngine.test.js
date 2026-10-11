import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assessFloodRisk,
  RISK_CATEGORIES,
  STALE_AFTER_MS,
  WARNING_LEVEL_FLOORS,
} from '../src/risk/floodRiskEngine.js'

const NOW = new Date('2026-07-10T12:00:00Z')

function weatherOk(overrides = {}) {
  return {
    status: 'ok',
    fetchedAt: '2026-07-10T11:45:00Z',
    observedAt: '2026-07-10T17:15:00+05:30',
    place: { name: 'Pune', state: 'Maharashtra', lat: 18.52, lon: 73.86, label: 'Pune, Maharashtra' },
    current: { temperatureC: 28.4, humidityPct: 82, precipitationMm: 0.6, windKmh: 14 },
    rainfall: {
      last24hMm: 8,
      last48hMm: 15,
      last72hMm: 22,
      next24hMm: 6,
      next48hMm: 11,
      next72hMm: 13,
      maxHourlyNext24hMm: 2.4,
      rainProbabilityNext24hPct: 55,
    },
    forecast: { daily: [] },
    source: { name: 'Open-Meteo', url: 'https://open-meteo.com/', note: 'test fixture' },
    ...overrides,
  }
}

function rainfallOnly(overrides = {}) {
  return { ...weatherOk().rainfall, ...overrides }
}

/* ---------------------------------------------------- normal conditions */

test('normal conditions produce a Low estimate with explained factors', () => {
  const assessment = assessFloodRisk({ weather: weatherOk(), warnings: null, now: NOW })

  assert.equal(assessment.status, 'ok')
  assert.equal(assessment.category, 'Low')
  assert.ok(RISK_CATEGORIES.includes(assessment.category))
  assert.ok(assessment.score >= 0 && assessment.score < 30)
  assert.equal(assessment.confidence, 'high')
  assert.equal(assessment.categorySource, 'weather-estimate')
  assert.equal(assessment.factors.length, 3)
  assert.equal(
    assessment.factors.reduce((sum, factor) => sum + factor.points, 0),
    assessment.score,
    'score equals the sum of factor points',
  )
  assert.ok(assessment.factors[0].detail.includes('IMD class'))
  assert.ok(assessment.safety && assessment.safety.actions.length > 0)
  assert.equal(assessment.provisional, true)
  assert.ok(assessment.limitations.length > 0)
  assert.ok(assessment.evaluatedAt)
})

/* ------------------------------------------------------ heavy rainfall */

test('very heavy 24-hour rain and saturated antecedent conditions produce Severe', () => {
  const weather = weatherOk({
    rainfall: rainfallOnly({ last24hMm: 130, last48hMm: 210, last72hMm: 260, next24hMm: 90, maxHourlyNext24hMm: 18 }),
  })
  const assessment = assessFloodRisk({ weather, warnings: null, now: NOW })

  assert.equal(assessment.status, 'ok')
  assert.equal(assessment.weatherCategory, 'Severe')
  assert.equal(assessment.category, 'Severe')
  assert.ok(assessment.score >= 80)
  assert.ok(assessment.score <= 100)
  const observed = assessment.factors.find((factor) => factor.key === 'observed-rainfall')
  assert.ok(observed.points >= 38, 'very heavy rain earns most of the observed component')
})

test('heavy rain across all windows lands in the High band', () => {
  const weather = weatherOk({
    rainfall: rainfallOnly({ last24hMm: 80, last72hMm: 120, next24hMm: 70 }),
  })
  const assessment = assessFloodRisk({ weather, warnings: null, now: NOW })

  assert.equal(assessment.status, 'ok')
  assert.equal(assessment.category, 'High')
  assert.ok(assessment.score >= 60 && assessment.score < 80)
})

/* ---------------------------------------------------------- missing data */

test('missing live weather never yields a score and never falls back to demo data', () => {
  const assessment = assessFloodRisk({ weather: null, warnings: null, now: NOW })

  assert.equal(assessment.status, 'weather-unavailable')
  assert.equal(assessment.score, null)
  assert.equal(assessment.category, null)
  assert.ok(assessment.notes.some((note) => note.includes('never replaced with demo values')))
})

test('weather service errors are surfaced instead of scored', () => {
  const weather = { status: 'error', reason: 'The weather service could not be reached.', fetchedAt: NOW.toISOString() }
  const assessment = assessFloodRisk({ weather, warnings: null, now: NOW })

  assert.equal(assessment.status, 'weather-unavailable')
  assert.equal(assessment.score, null)
  assert.ok(assessment.notes[0].includes('could not be reached'))
})

test('rainfall totals all missing produce insufficient-data, not a guess', () => {
  const weather = weatherOk({ rainfall: { last24hMm: null, next24hMm: null, last72hMm: null } })
  const assessment = assessFloodRisk({ weather, warnings: null, now: NOW })

  assert.equal(assessment.status, 'insufficient-data')
  assert.equal(assessment.score, null)
  assert.equal(assessment.category, null)
})

test('partially missing inputs lower confidence and add an explanation note', () => {
  const weather = weatherOk({ rainfall: { last24hMm: 40, next24hMm: null, last72hMm: 70 } })
  const assessment = assessFloodRisk({ weather, warnings: null, now: NOW })

  assert.equal(assessment.status, 'ok')
  assert.equal(assessment.confidence, 'medium')
  assert.ok(assessment.notes.some((note) => note.includes('Forecast 24-hour rainfall is missing')))
})

/* ----------------------------------------------------------- stale data */

test('stale weather data does not produce a score', () => {
  const staleTime = new Date(NOW.getTime() - (STALE_AFTER_MS + 60 * 60 * 1000)).toISOString()
  const weather = weatherOk({ fetchedAt: staleTime })
  const assessment = assessFloodRisk({ weather, warnings: null, now: NOW })

  assert.equal(assessment.status, 'stale')
  assert.equal(assessment.score, null)
  assert.equal(assessment.category, null)
  assert.ok(assessment.notes.some((note) => note.toLowerCase().includes('stale')))
})

/* ------------------------------------------------------ official warnings */

function warningsOk(level = 'red') {
  return {
    status: 'ok',
    level,
    district: 'PUNE',
    updatedAt: '2026-07-10T05:30:00Z',
    checkedAt: '2026-07-10T11:50:00Z',
    entries: [
      { district: 'PUNE', level, label: 'Today', date: '2026-07-10', detail: 'Heavy to very heavy rain', updatedAt: '2026-07-10T05:30:00Z' },
    ],
    source: { name: 'India Meteorological Department (IMD)', url: 'https://mausam.imd.gov.in/', note: 'official' },
  }
}

test('an official red warning raises a Low weather estimate to Severe and keeps sources visible', () => {
  const assessment = assessFloodRisk({ weather: weatherOk(), warnings: warningsOk('red'), now: NOW })

  assert.equal(assessment.status, 'ok')
  assert.equal(assessment.weatherCategory, 'Low')
  assert.equal(assessment.category, 'Severe')
  assert.equal(assessment.categorySource, 'official-warning-floor')
  assert.equal(assessment.warnings.level, 'red')
  assert.equal(assessment.warnings.status, 'ok')
  assert.equal(assessment.warnings.source.name, 'India Meteorological Department (IMD)')
  assert.equal(assessment.warnings.updatedAt, '2026-07-10T05:30:00Z')
  assert.ok(assessment.notes.some((note) => note.includes('official IMD red warning')))
  assert.ok(assessment.dataSources.some((source) => source.name.includes('India Meteorological Department')))
})

test('yellow and orange warnings map to Moderate and High floors', () => {
  assert.equal(WARNING_LEVEL_FLOORS.yellow, 'Moderate')
  assert.equal(WARNING_LEVEL_FLOORS.orange, 'High')

  const yellow = assessFloodRisk({ weather: weatherOk(), warnings: warningsOk('yellow'), now: NOW })
  assert.equal(yellow.category, 'Moderate')

  const orange = assessFloodRisk({ weather: weatherOk(), warnings: warningsOk('orange'), now: NOW })
  assert.equal(orange.category, 'High')
})

test('a green official colour keeps the weather-only estimate', () => {
  const assessment = assessFloodRisk({ weather: weatherOk(), warnings: warningsOk('green'), now: NOW })
  assert.equal(assessment.category, 'Low')
  assert.equal(assessment.categorySource, 'weather-estimate')
})

test('unavailable warning source is disclosed without blocking the weather estimate', () => {
  const warnings = {
    status: 'unavailable',
    reason: 'IMD servers do not allow cross-origin requests.',
    checkedAt: '2026-07-10T11:50:00Z',
    entries: [],
    source: { name: 'India Meteorological Department (IMD)', url: 'https://mausam.imd.gov.in/', note: 'official' },
  }
  const assessment = assessFloodRisk({ weather: weatherOk(), warnings, now: NOW })

  assert.equal(assessment.status, 'ok')
  assert.equal(assessment.category, 'Low')
  assert.equal(assessment.warnings.status, 'unavailable')
  assert.ok(assessment.notes.some((note) => note.toLowerCase().includes('official warning source')))
})

