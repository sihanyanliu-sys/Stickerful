import { LOCATION_PROVIDER } from './providerConfig'
import * as amapProvider from './amapProvider'
import * as googleProvider from './googleProvider'

const PROVIDERS = {
  amap: amapProvider,
  google: googleProvider,
}

function getProvider(provider = LOCATION_PROVIDER) {
  return PROVIDERS[provider] || PROVIDERS.amap
}

const CHINA_CITY_RE = /(中国|北京|上海|广州|深圳|杭州|成都|重庆|天津|南京|苏州|武汉|西安|长沙|青岛|厦门|福州|合肥|济南|郑州|沈阳|大连|昆明|贵阳|南宁|海口|太原|石家庄|哈尔滨|长春|呼和浩特|银川|西宁|兰州|乌鲁木齐|拉萨|宁波|佛山|东莞|珠海|常州|绍兴|泉州|温州|市|区|县)/
const LAT_LNG_CHINA_BOUNDS = {
  minLat: 18,
  maxLat: 54,
  minLng: 73,
  maxLng: 135,
}

function isInChina(location) {
  if (!location) return false
  const lat = Number(location.lat)
  const lng = Number(location.lng)
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= LAT_LNG_CHINA_BOUNDS.minLat &&
    lat <= LAT_LNG_CHINA_BOUNDS.maxLat &&
    lng >= LAT_LNG_CHINA_BOUNDS.minLng &&
    lng <= LAT_LNG_CHINA_BOUNDS.maxLng
}

function hasChineseText(query) {
  return /[\u4e00-\u9fff]/.test(query)
}

function dedupePlaces(places) {
  const seen = new Set()
  const out = []
  for (const place of places) {
    const key = `${place.provider}:${place.poiId || place.placeId || place.name + place.address}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(place)
  }
  return out
}

function getAutoProviderOrder(query, location) {
  if (CHINA_CITY_RE.test(query) || isInChina(location)) return ['amap', 'google']
  if (hasChineseText(query)) return ['amap', 'google']
  return ['google', 'amap']
}

async function trySearch(providerName, query, options) {
  const provider = getProvider(providerName)
  const results = await provider.searchPlaces(query, options)
  return results.map(place => ({
    ...place,
    provider: place.provider || providerName,
  }))
}

export async function searchPlaces(query, options = {}) {
  const mode = options.mode || 'auto'
  if (mode === 'china') return trySearch('amap', query, options)
  if (mode === 'global') return trySearch('google', query, options)

  const [first, second] = getAutoProviderOrder(query, options.location)
  try {
    const firstResults = await trySearch(first, query, options)
    if (firstResults.length > 0) return firstResults
  } catch {
    // Auto mode falls through to the secondary provider.
  }

  try {
    return dedupePlaces(await trySearch(second, query, options))
  } catch {
    return []
  }
}

export function getPlaceDetail(id, options = {}) {
  return getProvider(options.provider).getPlaceDetail(id, options)
}

export function getCurrentLocation(options = {}) {
  return getProvider(options.provider).getCurrentLocation(options)
}

export function openNavigation(place, options) {
  const provider = getProvider(place?.provider)
  return provider.openNavigation(place, options)
}

export function loadMapSdk(options) {
  return getProvider().loadAmap(options)
}

export { DEFAULT_CHINA_CENTER, LOCATION_PROVIDER } from './providerConfig'
