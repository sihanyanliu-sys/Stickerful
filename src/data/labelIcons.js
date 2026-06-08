// ─────────────────────────────────────────────────────────────────────────────
// Label-icon lookup helpers
// Wraps label-icon-manifest.json so callers can ask:
//   - getFunctionIcon('stamp-count' | 'city-count' | 'shop-count')
//   - getCityIcon('San Francisco' | '成都' | 'Chengdu')   → image path or null
// City lookup matches BOTH English `label` and Chinese `labelZh`, case-insensitive,
// because records may store either form depending on user input.
// Returns null when no match — caller is expected to fall back to emoji.
// ─────────────────────────────────────────────────────────────────────────────

import manifest from './labelIconManifest.json'

function normalizeCityName(cityName) {
  return String(cityName || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(中国|中华人民共和国)/, '')
    .replace(/(特别行政区|地区|城区|市)$/u, '')
}

// Build a case-insensitive lookup: normalized name → image path
const cityLookup = new Map()
for (const c of manifest.cityIcons) {
  if (c.label) {
    cityLookup.set(normalizeCityName(c.label), c.image)
  }
  if (c.labelZh) {
    cityLookup.set(normalizeCityName(c.labelZh), c.image)
    cityLookup.set(normalizeCityName(`${c.labelZh}市`), c.image)
  }
}

const functionLookup = new Map(
  manifest.functionIcons.map(f => [f.id, f.image])
)

export function getCityIcon(cityName) {
  if (!cityName) return null
  return cityLookup.get(normalizeCityName(cityName)) || null
}

export function getFunctionIcon(id) {
  return functionLookup.get(id) || null
}
