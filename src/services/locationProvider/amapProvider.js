import { COORD_TYPES, DEFAULT_SEARCH_OPTIONS } from './providerConfig'

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY
const AMAP_SECURITY_JS_CODE = import.meta.env.VITE_AMAP_SECURITY_JS_CODE
const LOADER_URL = 'https://webapi.amap.com/loader.js'
const DEFAULT_PLUGINS = [
  'AMap.AutoComplete',
  'AMap.PlaceSearch',
  'AMap.Geolocation',
  'AMap.Scale',
]

let loaderScriptPromise = null
let amapPromise = null

function ensureAmapConfig() {
  if (!AMAP_KEY) throw new Error('缺少 VITE_AMAP_KEY')
  if (AMAP_SECURITY_JS_CODE) {
    window._AMapSecurityConfig = {
      ...(window._AMapSecurityConfig || {}),
      securityJsCode: AMAP_SECURITY_JS_CODE,
    }
  }
}

function loadLoaderScript() {
  if (window.AMapLoader) return Promise.resolve()
  if (loaderScriptPromise) return loaderScriptPromise

  loaderScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LOADER_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('高德地图加载器加载失败')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = LOADER_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('高德地图加载器加载失败'))
    document.head.appendChild(script)
  })

  return loaderScriptPromise
}

export async function loadAmap(plugins = DEFAULT_PLUGINS) {
  ensureAmapConfig()
  await loadLoaderScript()

  if (!amapPromise) {
    amapPromise = window.AMapLoader.load({
      key: AMAP_KEY,
      version: '2.0',
      plugins: [...new Set([...DEFAULT_PLUGINS, ...plugins])],
    })
  }

  const AMap = await amapPromise
  const pluginList = Array.isArray(plugins) ? plugins : [plugins]
  await new Promise(resolve => {
    if (!pluginList.length || typeof AMap.plugin !== 'function') {
      resolve()
      return
    }
    AMap.plugin(pluginList, () => resolve())
  })
  return AMap
}

function getLngLat(location) {
  if (!location) return { lat: null, lng: null }
  if (Array.isArray(location)) return { lng: Number(location[0]), lat: Number(location[1]) }
  if (typeof location.getLng === 'function' && typeof location.getLat === 'function') {
    return { lng: location.getLng(), lat: location.getLat() }
  }
  return {
    lng: Number(location.lng ?? location.longitude),
    lat: Number(location.lat ?? location.latitude),
  }
}

function textOrEmpty(value) {
  if (!value || Array.isArray(value)) return ''
  return String(value)
}

function normalizeAmapPlace(place = {}) {
  const { lat, lng } = getLngLat(place.location || place.position)
  const city = textOrEmpty(place.cityname || place.city || place.district)
  const address = textOrEmpty(place.address || place.formattedAddress || place.district)
  const poiId = place.id || place.poiid || place.placeId || ''
  const distance = Number(place.distance)

  return {
    provider: 'amap',
    poiId,
    placeId: poiId,
    name: textOrEmpty(place.name),
    address,
    city,
    adcode: textOrEmpty(place.adcode),
    district: textOrEmpty(place.district),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    distance: Number.isFinite(distance) ? distance : null,
    coordType: COORD_TYPES.AMAP,
    raw: place,
  }
}

function searchNearbyPlaces(AMap, query, config) {
  const placeSearch = new AMap.PlaceSearch({
    city: config.city || '全国',
    pageSize: config.pageSize || 20,
    pageIndex: 1,
    extensions: 'base',
  })
  const center = [config.location.lng, config.location.lat]
  const radius = config.radius || 5000

  return new Promise((resolve, reject) => {
    placeSearch.searchNearBy(query, center, radius, (status, result) => {
      if (status !== 'complete') {
        reject(new Error(result?.info || '高德附近搜索失败'))
        return
      }
      const pois = Array.isArray(result?.poiList?.pois) ? result.poiList.pois : []
      resolve(
        pois
          .map(poi => normalizeAmapPlace(poi))
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      )
    })
  })
}

function searchTextPlaces(AMap, query, config) {
  const placeSearch = new AMap.PlaceSearch({
    city: config.city || '全国',
    citylimit: config.cityLimit || false,
    pageSize: config.pageSize || 20,
    pageIndex: 1,
    extensions: 'base',
  })

  return new Promise((resolve, reject) => {
    placeSearch.search(query, (status, result) => {
      if (status !== 'complete') {
        reject(new Error(result?.info || '高德地点搜索失败'))
        return
      }
      const pois = Array.isArray(result?.poiList?.pois) ? result.poiList.pois : []
      resolve(pois.map(poi => normalizeAmapPlace(poi)))
    })
  })
}

function mergePlaces(primary, fallback) {
  const seen = new Set()
  const merged = []
  for (const place of [...primary, ...fallback]) {
    const key = place.poiId || `${place.name}|${place.address}|${place.city}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(place)
  }
  return merged
}

export async function searchPlaces(query, options = {}) {
  const q = query.trim()
  if (!q) return []

  const AMap = await loadAmap(['AMap.AutoComplete', 'AMap.PlaceSearch'])
  const config = { ...DEFAULT_SEARCH_OPTIONS, ...options }
  if (
    config.location &&
    Number.isFinite(Number(config.location.lat)) &&
    Number.isFinite(Number(config.location.lng))
  ) {
    const nearby = await searchNearbyPlaces(AMap, q, {
      ...config,
      location: {
        lat: Number(config.location.lat),
        lng: Number(config.location.lng),
      },
    })
    if (nearby.length >= 5) return nearby

    // Chain names or city-qualified searches can be outside the current radius.
    // Keep nearby results first, then add broader text-search matches.
    const broader = await searchTextPlaces(AMap, q, config).catch(() => [])
    return mergePlaces(nearby, broader)
  }

  const textResults = await searchTextPlaces(AMap, q, config).catch(() => [])
  if (textResults.length > 0) return textResults

  const autoComplete = new AMap.AutoComplete({
    city: config.city,
    citylimit: config.cityLimit,
    datatype: 'poi',
  })

  return new Promise((resolve, reject) => {
    autoComplete.search(q, (status, result) => {
      if (status !== 'complete') {
        reject(new Error(result?.info || '高德地点搜索失败'))
        return
      }
      const tips = Array.isArray(result?.tips) ? result.tips : []
      resolve(
        tips
          .filter(tip => tip?.name && tip?.id)
          .map(tip => normalizeAmapPlace(tip))
      )
    })
  })
}

export async function getPlaceDetail(id) {
  if (!id) throw new Error('缺少地点 ID')

  const AMap = await loadAmap(['AMap.PlaceSearch'])
  const placeSearch = new AMap.PlaceSearch({
    city: '全国',
    pageSize: 1,
    extensions: 'all',
  })

  return new Promise((resolve, reject) => {
    placeSearch.getDetails(id, (status, result) => {
      if (status !== 'complete') {
        reject(new Error(result?.info || '获取地点详情失败'))
        return
      }
      const place = result?.poiList?.pois?.[0]
      if (!place) {
        reject(new Error('没有找到地点详情'))
        return
      }
      resolve(normalizeAmapPlace(place))
    })
  })
}

export async function getCurrentLocation() {
  const AMap = await loadAmap(['AMap.Geolocation'])
  const geolocation = new AMap.Geolocation({
    enableHighAccuracy: false,
    timeout: 5000,
    GeoLocationFirst: false,
    needAddress: false,
  })

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition((status, result) => {
      if (status !== 'complete') {
        reject(new Error(result?.message || result?.info || '定位失败'))
        return
      }
      const { lat, lng } = getLngLat(result.position)
      resolve({
        provider: 'amap',
        lat,
        lng,
        coordType: COORD_TYPES.AMAP,
        accuracy: result.accuracy,
        raw: result,
      })
    })
  })
}

export function openNavigation(place) {
  const lat = place?.lat
  const lng = place?.lng
  const name = encodeURIComponent(place?.name || '目的地')
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false

  const url = `https://uri.amap.com/marker?position=${lng},${lat}&name=${name}&coordinate=gaode&callnative=1`
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

export { normalizeAmapPlace }
