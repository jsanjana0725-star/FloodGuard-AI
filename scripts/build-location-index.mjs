/**
 * Builds the compact India location search index used by the dashboard.
 *
 * Source (downloaded to a temp location, never committed):
 *   https://raw.githubusercontent.com/prasad-gowda/india-state-district-cities/master/India-state-district-city.json
 *   (reference data derived from citypopulation.de / Census of India)
 *
 * Usage:
 *   node scripts/build-location-index.mjs [path-to-raw-source.json]
 *
 * Output:
 *   src/data/india-locations.json — { source, states: [{ name, districts: [] }], places: [[name, stateIndex], ...] }
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const RAW_SOURCE = process.argv[2]
if (!RAW_SOURCE) {
  console.error('Usage: node scripts/build-location-index.mjs <path-to-raw-source.json>')
  process.exit(1)
}

const raw = JSON.parse(readFileSync(RAW_SOURCE, 'utf8'))
if (!Array.isArray(raw)) {
  console.error('Unexpected source format: expected an array of states.')
  process.exit(1)
}

const skipCityStatuses = new Set(['Village', 'Gram Panchayat with Outgrowth'])

const states = raw.map((entry) => ({
  name: entry.name,
  districts: (entry.districts || []).filter(Boolean),
}))

const seenPlaces = new Set()
const places = []
let skippedDuplicates = 0
let skippedVillages = 0

for (let stateIndex = 0; stateIndex < raw.length; stateIndex += 1) {
  for (const city of raw[stateIndex].cities || []) {
    if (!city || !city.name) continue
    if (skipCityStatuses.has(city.status)) {
      skippedVillages += 1
      continue
    }
    const key = `${stateIndex}|${city.name.toLowerCase()}`
    if (seenPlaces.has(key)) {
      skippedDuplicates += 1
      continue
    }
    seenPlaces.add(key)
    places.push([city.name, stateIndex])
  }
}

const output = {
  source: 'prasad-gowda/india-state-district-cities (derived from citypopulation.de / Census of India)',
  sourceUrl: 'https://github.com/prasad-gowda/india-state-district-cities',
  states,
  places,
}

const outputPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'india-locations.json')
writeFileSync(outputPath, `${JSON.stringify(output)}\n`, 'utf8')

const districtCount = states.reduce((total, state) => total + state.districts.length, 0)
const sizeKb = (readFileSync(outputPath).length / 1024).toFixed(1)
console.log(`Wrote ${outputPath}`)
console.log(`  states/UTs: ${states.length}`)
console.log(`  districts:  ${districtCount}`)
console.log(`  cities:     ${places.length} (skipped duplicates: ${skippedDuplicates}, villages: ${skippedVillages})`)
console.log(`  size:       ${sizeKb} KB`)