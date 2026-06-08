import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSettings } from '../context/SettingsContext'
import StampIcon from '../components/StampIcon'
import { DEFAULT_CHINA_CENTER, getCurrentLocation, loadMapSdk } from '../services/locationProvider'

const USER_LOC_KEY = 'stickerful_user_loc'
const MAP_MODE_KEY = 'stickerful_map_mode'

const MAP_MODES = [
  { id: 'auto', label: '自动' },
  { id: 'china', label: '中国' },
  { id: 'global', label: '海外' },
]

const CITY_COORDS = {
  'San Gabriel':   [34.0961, -118.1058],
  'San Francisco': [37.7749, -122.4194],
  'Portland':      [45.5051, -122.6750],
  'Chicago':       [41.8781, -87.6298],
  'New York':      [40.7128, -74.0060],
  'Los Angeles':   [34.0522, -118.2437],
  'Seattle':       [47.6062, -122.3321],
  'Austin':        [30.2672, -97.7431],
  'Miami':         [25.7617, -80.1918],
  'Boston':        [42.3601, -71.0589],
  'Washington DC': [38.9072, -77.0369],
  'Washington, DC':[38.9072, -77.0369],
  'Phoenix':       [33.4484, -112.0740],
  'Orlando':       [28.5383, -81.3792],
  'New Orleans':   [29.9511, -90.0715],
  'Denver':        [39.7392, -104.9903],
  'Nashville':     [36.1627, -86.7816],
  'Santa Cruz':    [36.9741, -122.0308],
  'Bentonville':   [36.3729, -94.2088],
  'Tokyo':         [35.6762, 139.6503],
  'Seoul':         [37.5665, 126.9780],
  'London':        [51.5074,  -0.1278],
  'Paris':         [48.8566,   2.3522],
  'Berlin':        [52.5200,  13.4050],
  'Shanghai':      [31.2304, 121.4737],
  'Beijing':       [39.9042, 116.4074],
  '上海':           [31.2304, 121.4737],
  '上海市':          [31.2304, 121.4737],
  '北京':           [39.9042, 116.4074],
  '北京市':          [39.9042, 116.4074],
  '成都':           [30.5728, 104.0668],
  '成都市':          [30.5728, 104.0668],
  '广州':           [23.1291, 113.2644],
  '广州市':          [23.1291, 113.2644],
  '深圳':           [22.5431, 114.0579],
  '深圳市':          [22.5431, 114.0579],
  '杭州':           [30.2741, 120.1551],
  '杭州市':          [30.2741, 120.1551],
  '南京':           [32.0603, 118.7969],
  '南京市':          [32.0603, 118.7969],
  '苏州':           [31.2989, 120.5853],
  '苏州市':          [31.2989, 120.5853],
  '武汉':           [30.5928, 114.3055],
  '武汉市':          [30.5928, 114.3055],
  '西安':           [34.3416, 108.9398],
  '西安市':          [34.3416, 108.9398],
  '重庆':           [29.5630, 106.5516],
  '重庆市':          [29.5630, 106.5516],
  '天津':           [39.3434, 117.3616],
  '天津市':          [39.3434, 117.3616],
  '长沙':           [28.2282, 112.9388],
  '长沙市':          [28.2282, 112.9388],
  '沈阳':           [41.8057, 123.4315],
  '沈阳市':          [41.8057, 123.4315],
  '大连':           [38.9140, 121.6147],
  '大连市':          [38.9140, 121.6147],
  '青岛':           [36.0671, 120.3826],
  '青岛市':          [36.0671, 120.3826],
  '厦门':           [24.4798, 118.0894],
  '厦门市':          [24.4798, 118.0894],
  '合肥':           [31.8206, 117.2272],
  '合肥市':          [31.8206, 117.2272],
  '郑州':           [34.7466, 113.6254],
  '郑州市':          [34.7466, 113.6254],
  '济南':           [36.6512, 117.1201],
  '济南市':          [36.6512, 117.1201],
  '福州':           [26.0745, 119.2965],
  '福州市':          [26.0745, 119.2965],
  '昆明':           [25.0389, 102.7183],
  '昆明市':          [25.0389, 102.7183],
  '南昌':           [28.6820, 115.8582],
  '南昌市':          [28.6820, 115.8582],
}

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}

function readMapMode() {
  try {
    const stored = localStorage.getItem(MAP_MODE_KEY)
    return MAP_MODES.some(mode => mode.id === stored) ? stored : 'auto'
  } catch {
    return 'auto'
  }
}

function hasCoordValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function isFiniteCoord(lat, lng) {
  if (!hasCoordValue(lat) || !hasCoordValue(lng)) return false
  const latNum = Number(lat)
  const lngNum = Number(lng)
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false
  return !(latNum === 0 && lngNum === 0)
}

function normalizeCityKey(city) {
  return String(city || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/市$/u, '')
}

function getCityCoord(city) {
  if (!city) return null
  if (CITY_COORDS[city]) return CITY_COORDS[city]

  const normalized = normalizeCityKey(city)
  const match = Object.entries(CITY_COORDS).find(([name]) => {
    const key = normalizeCityKey(name)
    return normalized === key || normalized.includes(key) || key.includes(normalized)
  })
  return match?.[1] || null
}

function isChinaCoord(coord) {
  if (!coord) return false
  const lat = Number(coord.lat ?? coord[0])
  const lng = Number(coord.lng ?? coord[1])
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= 18 && lat <= 54 &&
    lng >= 73 && lng <= 135
}

function getRecordCoord(record) {
  if (isFiniteCoord(record.lat, record.lng)) return [Number(record.lat), Number(record.lng)]
  return getCityCoord(record.city)
}

function resolveMapProvider(mode, records, cachedLocation) {
  if (mode === 'china') return 'amap'
  if (mode === 'global') return 'leaflet'
  if (cachedLocation && isFiniteCoord(cachedLocation.lat, cachedLocation.lng)) {
    return isChinaCoord(cachedLocation) ? 'amap' : 'leaflet'
  }

  const coords = records.map(getRecordCoord).filter(Boolean)
  if (coords.some(coord => !isChinaCoord(coord))) return 'leaflet'
  if (coords.some(coord => isChinaCoord(coord))) return 'amap'
  return 'amap'
}

function buildGroups(records) {
  return records.reduce((acc, r) => {
    const coord = getRecordCoord(r)
    if (!coord) return acc
    const hasCoords = isFiniteCoord(r.lat, r.lng)
    const key = hasCoords ? (r.poiId || r.placeId || `${r.lat},${r.lng}`) : r.city
    if (!acc[key]) acc[key] = { recs: [], city: r.city, lat: coord[0], lng: coord[1], shopName: r.shopName }
    acc[key].recs.push(r)
    return acc
  }, {})
}

function getMarkerCoords(records) {
  const seen = new Set()
  return records.reduce((arr, record) => {
    const coord = getRecordCoord(record)
    if (!coord) return arr
    const key = coord.join(',')
    if (seen.has(key)) return arr
    seen.add(key)
    arr.push(coord)
    return arr
  }, [])
}

function toAmapPosition(coord) {
  return [coord[1], coord[0]]
}

function makePinContent(color, count, isSelected) {
  const size = isSelected ? 52 : 44
  const border = isSelected ? `3px solid ${color}` : `2.5px solid ${color}44`
  const shadow = isSelected
    ? `0 4px 16px ${color}55`
    : '0 2px 8px rgba(44,24,16,0.18)'
  const badge = count > 1
    ? `<div style="position:absolute;top:-5px;right:-5px;width:18px;height:18px;border-radius:50%;background:${color};color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:sans-serif;">${count}</div>`
    : ''

  return `
    <div style="display:flex;flex-direction:column;align-items:center;position:relative;">
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:#fff;
        border:${border};
        box-shadow:${shadow};
        display:flex;align-items:center;justify-content:center;
        font-size:${isSelected ? 26 : 22}px;
        position:relative;
        transition:all 0.2s;
      ">
        ☕
        ${badge}
      </div>
      <div style="width:2.5px;height:9px;background:${color};margin-top:-1px;border-radius:0 0 2px 2px;opacity:0.8;"></div>
      <div style="width:5px;height:5px;border-radius:50%;background:${color};margin-top:-1px;opacity:0.6;"></div>
    </div>
  `
}

function makeLeafletIcon(color, count, isSelected) {
  const size = isSelected ? 52 : 44
  return L.divIcon({
    html: makePinContent(color, count, isSelected),
    className: '',
    iconSize: [size, size + 16],
    iconAnchor: [size / 2, size + 16],
    popupAnchor: [0, -(size + 16)],
  })
}

function destroyMap(map, provider) {
  if (!map) return
  if (provider === 'leaflet') map.remove()
  else map.destroy()
}

export default function MapPage({ navigate, records = [] }) {
  const { settings } = useSettings()
  const color = settings.stampColor || '#C98D48'
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const mapApiRef = useRef(null)
  const mapProviderRef = useRef(null)
  const markersRef = useRef({})
  const [selected, setSelected] = useState(null)
  const [mapRevision, setMapRevision] = useState(0)
  const [mapMode, setMapMode] = useState(readMapMode)
  const [cachedLocation, setCachedLocation] = useState(() => readJson(USER_LOC_KEY))
  const [locationState, setLocationState] = useState({
    status: 'locating',
    text: '正在定位你附近的区域...',
  })

  const resolvedProvider = useMemo(
    () => resolveMapProvider(mapMode, records, cachedLocation),
    [mapMode, records, cachedLocation]
  )
  const groups = useMemo(() => buildGroups(records), [records])
  const markerCount = Object.keys(groups).length
  const mapProviderLabel = resolvedProvider === 'amap' ? '高德' : 'OSM'
  const unknownCities = [...new Set(records.filter(r => !getRecordCoord(r)).map(r => r.city))]

  function setMode(nextMode) {
    setMapMode(nextMode)
    setSelected(null)
    try { localStorage.setItem(MAP_MODE_KEY, nextMode) } catch {
      // Mode selection still works if storage is unavailable.
    }
  }

  function clearMarkers() {
    Object.values(markersRef.current).forEach(marker => {
      if (mapProviderRef.current === 'leaflet') marker.remove()
      else mapInstanceRef.current?.remove(marker)
    })
    markersRef.current = {}
  }

  function setMarkerVisual(marker, count, isSelected) {
    if (mapProviderRef.current === 'leaflet') marker.setIcon(makeLeafletIcon(color, count, isSelected))
    else marker.setContent(makePinContent(color, count, isSelected))
  }

  function setMetroView(lat, lng, animate = false) {
    const map = mapInstanceRef.current
    if (!map) return
    if (mapProviderRef.current === 'leaflet') {
      map.setView([lat, lng], 11, { animate })
      return
    }
    const position = [lng, lat]
    if (animate && typeof map.setZoomAndCenter === 'function') map.setZoomAndCenter(11, position)
    else map.setCenter(position)
    map.setZoom(11)
  }

  function fallbackToRecords() {
    const map = mapInstanceRef.current
    if (!map) return
    const coords = getMarkerCoords(records)
    if (coords.length === 1) {
      setMetroView(coords[0][0], coords[0][1], true)
      return
    }
    if (coords.length > 1) {
      const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
      const coord = getRecordCoord(sorted[0])
      if (coord) setMetroView(coord[0], coord[1], true)
      else fitAll()
    }
  }

  async function requestUserLocation({ fallbackOnFailure = false } = {}) {
    const provider = mapMode === 'china' ? 'amap' : 'google'
    setLocationState({ status: 'locating', text: '正在定位你附近的区域...' })
    try {
      const loc = await getCurrentLocation({ provider })
      try { localStorage.setItem(USER_LOC_KEY, JSON.stringify(loc)) } catch {
        // Location still works if private browsing blocks localStorage.
      }
      setCachedLocation(loc)
      setMetroView(loc.lat, loc.lng, true)
      setSelected(null)
      setLocationState({ status: 'current', text: `已使用你当前附近的位置，当前地图为 ${mapProviderLabel}。` })
    } catch {
      if (fallbackOnFailure) {
        fallbackToRecords()
        setLocationState({ status: 'fallback', text: '定位仍然失败，已显示最近一条记录附近。' })
        return
      }
      setLocationState({
        status: 'failed',
        text: '定位失败。地图暂未自动跳转到最近记录。',
      })
    }
  }

  useEffect(() => {
    let cancelled = false
    clearMarkers()

    if (mapInstanceRef.current) {
      destroyMap(mapInstanceRef.current, mapProviderRef.current)
      mapInstanceRef.current = null
      mapApiRef.current = null
    }

    async function initMap() {
      try {
        if (!mapRef.current) return
        mapProviderRef.current = resolvedProvider

        if (resolvedProvider === 'leaflet') {
          const map = L.map(mapRef.current, {
            center: [20, 0],
            zoom: 2,
            zoomControl: false,
            attributionControl: true,
          })
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map)
          map.createPane('stickerfulPins')
          map.getPane('stickerfulPins').style.zIndex = 720
          mapInstanceRef.current = map
          if (!cancelled) setMapRevision(value => value + 1)
        } else {
          const AMap = await loadMapSdk(['AMap.Scale'])
          if (cancelled || !mapRef.current) return
          mapApiRef.current = AMap
          const map = new AMap.Map(mapRef.current, {
            center: [DEFAULT_CHINA_CENTER.lng, DEFAULT_CHINA_CENTER.lat],
            zoom: 4,
            zoomEnable: true,
            dragEnable: true,
            viewMode: '2D',
          })
          map.addControl(new AMap.Scale())
          mapInstanceRef.current = map
          if (!cancelled) setMapRevision(value => value + 1)
        }

        requestAnimationFrame(() => requestUserLocation({ fallbackOnFailure: true }))
      } catch {
        setLocationState({
          status: 'failed',
          text: resolvedProvider === 'amap'
            ? '高德地图加载失败，请检查 Key 和网络。'
            : '海外地图加载失败，请检查网络。',
        })
      }
    }

    initMap()

    return () => {
      cancelled = true
      clearMarkers()
      destroyMap(mapInstanceRef.current, mapProviderRef.current)
      mapInstanceRef.current = null
      mapApiRef.current = null
    }
  }, [resolvedProvider])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    clearMarkers()

    Object.entries(groups).forEach(([key, group]) => {
      const coords = [Number(group.lat), Number(group.lng)]
      if (mapProviderRef.current === 'leaflet') {
        const marker = L.marker(coords, {
          icon: makeLeafletIcon(color, group.recs.length, false),
          pane: 'stickerfulPins',
          zIndexOffset: 1000,
        }).addTo(map)
        marker.on('click', () => {
          Object.entries(markersRef.current).forEach(([k, m]) =>
            setMarkerVisual(m, groups[k]?.recs.length || 1, false)
          )
          setMarkerVisual(marker, group.recs.length, true)
          setSelected({
            city: group.city,
            shopName: group.shopName,
            recs: [...group.recs].sort((a, b) => b.date.localeCompare(a.date)),
          })
          map.setView(coords, Math.max(map.getZoom(), 13), { animate: true })
        })
        markersRef.current[key] = marker
        return
      }

      const AMap = mapApiRef.current
      const marker = new AMap.Marker({
        position: toAmapPosition(coords),
        content: makePinContent(color, group.recs.length, false),
        anchor: 'bottom-center',
        offset: new AMap.Pixel(0, 0),
      })
      map.add(marker)
      marker.on('click', () => {
        Object.entries(markersRef.current).forEach(([k, m]) =>
          setMarkerVisual(m, groups[k]?.recs.length || 1, false)
        )
        setMarkerVisual(marker, group.recs.length, true)
        setSelected({
          city: group.city,
          shopName: group.shopName,
          recs: [...group.recs].sort((a, b) => b.date.localeCompare(a.date)),
        })
        map.setZoomAndCenter(Math.max(map.getZoom(), 13), toAmapPosition(coords))
      })
      markersRef.current[key] = marker
    })
  }, [groups, color, mapRevision])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    setSelected(null)
    Object.entries(markersRef.current).forEach(([key, marker]) => {
      setMarkerVisual(marker, groups[key]?.recs.length || 1, false)
    })
  }

  function fitAll() {
    const map = mapInstanceRef.current
    if (!map) return
    const coords = getMarkerCoords(records)
    if (coords.length === 0) {
      if (mapProviderRef.current === 'leaflet') map.setView([20, 0], 2)
      else map.setZoomAndCenter(4, [DEFAULT_CHINA_CENTER.lng, DEFAULT_CHINA_CENTER.lat])
      return
    }
    if (coords.length === 1) {
      if (mapProviderRef.current === 'leaflet') map.setView(coords[0], 13, { animate: true })
      else map.setZoomAndCenter(13, toAmapPosition(coords[0]))
      return
    }
    if (mapProviderRef.current === 'leaflet') {
      map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom: 13 })
    } else {
      map.setFitView(Object.values(markersRef.current))
    }
    setSelected(null)
  }

  return (
    <div className="app-page-bg flex flex-col h-full relative">
      <div ref={mapRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-14 pb-3 z-10">
        <div
          className="rounded-[14px] px-4 py-2 flex items-center gap-2"
          style={{
            background: 'rgba(255,252,248,0.92)',
            boxShadow: 'var(--shadow-md)',
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto',
          }}
        >
          <span className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>
            全球足迹
          </span>
          <span
            className="text-[12px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: `${color}20`, color }}
          >
            {markerCount} 个地点
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>
            {mapProviderLabel}
          </span>
        </div>

        <button
          onClick={fitAll}
          className="w-10 h-10 rounded-full flex items-center justify-center active:opacity-70"
          style={{
            background: 'rgba(255,252,248,0.92)',
            boxShadow: 'var(--shadow-md)',
            backdropFilter: 'blur(10px)',
          }}
          aria-label="查看全部地点"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M1 5V2h3M14 2h3v3M17 13v3h-3M4 17H1v-3" stroke="var(--text-1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div
        className="absolute top-[104px] left-4 right-4 rounded-[14px] p-1 z-10 grid grid-cols-3 gap-1"
        style={{
          background: 'rgba(255,252,248,0.92)',
          boxShadow: 'var(--shadow-sm)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'auto',
        }}
      >
        {MAP_MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => setMode(mode.id)}
            className="h-8 rounded-[10px] text-[12px] font-semibold active:opacity-70"
            style={{
              background: mapMode === mode.id ? color : 'transparent',
              color: mapMode === mode.id ? '#fff' : 'var(--text-2)',
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div
        className="absolute top-[154px] left-4 right-4 rounded-[14px] px-4 py-3 z-10"
        style={{
          background: 'rgba(255,252,248,0.94)',
          boxShadow: 'var(--shadow-md)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'auto',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-none"
            style={{ background: `${color}18`, color }}
          >
            {locationState.status === 'locating'
              ? '⌖'
              : locationState.status === 'current'
                ? '✓'
                : '!'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
              {locationState.status === 'locating'
                ? '定位中'
                : locationState.status === 'current'
                  ? '使用当前位置'
                  : locationState.status === 'fallback'
                    ? '显示最近记录'
                    : '定位失败'}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>
              {locationState.text}
            </p>
          </div>
          {locationState.status !== 'locating' && (
            <button
              onClick={() => requestUserLocation({ fallbackOnFailure: true })}
              className="px-3 py-2 rounded-[12px] text-[12px] font-semibold active:opacity-70 flex-none"
              style={{ background: color, color: '#fff' }}
            >
              定位到我附近
            </button>
          )}
        </div>
      </div>

      {unknownCities.length > 0 && !selected && (
        <div
          className="absolute bottom-6 left-4 right-4 rounded-[14px] px-4 py-3 z-10"
          style={{ background: 'rgba(255,252,248,0.92)', boxShadow: 'var(--shadow-md)', backdropFilter: 'blur(10px)' }}
        >
          <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>
            以下城市暂无坐标，无法显示：{unknownCities.join('、')}
          </p>
        </div>
      )}

      {selected && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 rounded-t-[24px] px-5 pt-4 pb-8"
          style={{ background: 'var(--surface)', boxShadow: '0 -4px 24px rgba(44,24,16,0.12)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-1 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" style={{ background: 'var(--border)' }} />
            <div>
              <p className="font-display text-[20px] font-bold" style={{ color: 'var(--text-1)' }}>{selected.city}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>{selected.recs.length} 条打卡记录</p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center active:opacity-60"
              style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
            >✕</button>
          </div>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
            {selected.recs.map(r => (
              <button
                key={r.id}
                onClick={() => navigate('stamp-detail', { stamp: r })}
                className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-left active:opacity-70"
                style={{ background: 'var(--surface-2)' }}
              >
                <StampIcon emoji={r.emoji} photo={r.photo} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] truncate" style={{ color: 'var(--text-1)' }}>{r.shopName}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>{r.date}</p>
                </div>
                <span className="text-[13px]" style={{ color: '#FFCC00' }}>
                  {'★'.repeat(r.rating || 0)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
