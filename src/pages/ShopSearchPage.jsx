import { useState, useRef, useCallback, useMemo } from 'react'
import { useSettings } from '../context/SettingsContext'
import { getCurrentLocation, getPlaceDetail, searchPlaces } from '../services/locationProvider'

// 把 YYYY-MM-DD 转成"今天 / 昨天 / N 天前 / N 周前 / 原日期"
function formatRelativeDate(dateStr) {
  if (!dateStr) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d     = new Date(dateStr + 'T00:00:00'); d.setHours(0, 0, 0, 0)
  const days  = Math.round((today - d) / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days <   7) return `${days} 天前`
  if (days <  30) return `${Math.floor(days / 7)} 周前`
  return dateStr
}

const USER_LOC_KEY = 'stickerful_user_loc'
const SEARCH_MODES = [
  { id: 'auto', label: '自动' },
  { id: 'china', label: '中国' },
  { id: 'global', label: '海外' },
]

function getCachedLocation() {
  try {
    const cached = JSON.parse(localStorage.getItem(USER_LOC_KEY) || 'null')
    if (cached && isUsableCoord(cached.lat, cached.lng)) {
      return { lat: Number(cached.lat), lng: Number(cached.lng), provider: cached.provider || 'amap' }
    }
  } catch {
    // Search still works without cached location.
  }
  return null
}

function hasCoordValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function isUsableCoord(lat, lng) {
  if (!hasCoordValue(lat) || !hasCoordValue(lng)) return false
  const latNum = Number(lat)
  const lngNum = Number(lng)
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false
  return !(latNum === 0 && lngNum === 0)
}

function formatDistance(distance) {
  const meters = Number(distance)
  if (!Number.isFinite(meters)) return ''
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)}km`
}

export default function ShopSearchPage({ navigate, params = {}, records = [] }) {
  const { settings } = useSettings()
  const color = settings.stampColor || '#C98D48'

  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [searchOrigin, setSearchOrigin] = useState(() => getCachedLocation())
  const [locating, setLocating] = useState(false)
  const [searchMode, setSearchMode] = useState('auto')
  const debounceRef = useRef(null)

  // 空状态下的快捷店铺：最近 3 个不同店 + 常去 Top 3（去重）
  const { recentShops, topShops } = useMemo(() => {
    if (records.length === 0) return { recentShops: [], topShops: [] }

    // 按日期降序、同日期按 id 降序（newest first）
    const sorted = [...records].sort((a, b) => {
      const c = (b.date || '').localeCompare(a.date || '')
      return c !== 0 ? c : ((b.id || 0) - (a.id || 0))
    })

    // 最近：店铺去重，取最新 3 家
    const recent = []
    const recentKeys = new Set()
    for (const r of sorted) {
      const key = `${r.shopName}|${r.city || ''}`
      if (!r.shopName || recentKeys.has(key)) continue
      recentKeys.add(key)
      recent.push(r)
      if (recent.length === 3) break
    }

    // Top：按访问次数排序，跳过已出现在"最近"里的
    const counts = new Map()
    for (const r of sorted) {
      const key = `${r.shopName}|${r.city || ''}`
      if (!r.shopName || recentKeys.has(key)) continue
      if (!counts.has(key)) counts.set(key, { repr: r, count: 0 })
      counts.get(key).count++
    }
    const top = [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(o => ({ ...o.repr, _count: o.count }))

    return { recentShops: recent, topShops: top }
  }, [records])

  function pickRecorded(r) {
    const shop = {
      provider: r.provider || null,
      poiId:    r.poiId || r.placeId || null,
      name:    r.shopName,
      city:    r.city || '',
      address: '',
      adcode:  r.adcode || '',
      lat:     r.lat || null,
      lng:     r.lng || null,
      placeId: r.placeId || null,
      coordType: r.coordType || null,
    }
    navigate(-1, { shop, _restore: params._restore })
  }

  const ensureSearchOrigin = useCallback(async () => {
    const cached = getCachedLocation()
    if (cached) {
      setSearchOrigin(cached)
      return cached
    }

    setLocating(true)
    try {
      const loc = await getCurrentLocation()
      try { localStorage.setItem(USER_LOC_KEY, JSON.stringify(loc)) } catch {
        // Nearby search can continue even if cache write fails.
      }
      setSearchOrigin(loc)
      return loc
    } catch {
      setSearchOrigin(null)
      return null
    } finally {
      setLocating(false)
    }
  }, [])

  const search = useCallback(async (q, modeOverride) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    setError(null)
    try {
      const mode = modeOverride || searchMode
      const origin = searchOrigin || await ensureSearchOrigin()
      const suggestions = await searchPlaces(q, origin
        ? { city: '全国', location: origin, radius: 10000, pageSize: 20, mode }
        : { city: '全国', mode }
      )
      setResults(suggestions)
    } catch (e) {
      setError('搜索失败：' + e.message)
    } finally {
      setLoading(false)
    }
  }, [ensureSearchOrigin, searchMode, searchOrigin])

  function handleModeChange(mode) {
    setSearchMode(mode)
    if (query.trim()) search(query, mode)
  }

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 350)
  }

  async function handleSelect(suggestion) {
    const id = suggestion.poiId || suggestion.placeId
    if (!id) return
    setLoading(true)
    try {
      const place = await getPlaceDetail(id, { provider: suggestion.provider })
      const shop  = {
        provider:  place.provider,
        poiId:     place.poiId,
        name:      place.name || suggestion.name || '',
        city:      place.city || suggestion.city || '',
        address:   place.address || suggestion.address || '',
        adcode:    place.adcode || suggestion.adcode || '',
        lat:       place.lat ?? suggestion.lat ?? null,
        lng:       place.lng ?? suggestion.lng ?? null,
        placeId:   place.placeId || place.poiId,
        coordType: place.coordType,
      }
      navigate(-1, { shop, _restore: params._restore })
    } catch (e) {
      setError('获取详情失败：' + e.message)
      setLoading(false)
    }
  }

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Nav */}
      <div className="px-5 pt-14 pb-3 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1, params._restore ? { _restore: params._restore } : {})}
            className="font-medium text-[16px] active:opacity-60"
            style={{ color }}
          >
            取消
          </button>
          <h2 className="font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>搜索店铺</h2>
        </div>
        <div className="flex mb-3 rounded-[12px] p-1" style={{ background: 'var(--surface-2)' }}>
          {SEARCH_MODES.map(mode => {
            const active = searchMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className="flex-1 py-1.5 rounded-[9px] text-[12px] font-semibold active:opacity-70"
                style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? color : 'var(--text-2)',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {mode.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center rounded-[12px] px-3 gap-2" style={{ background: 'var(--surface-2)' }}>
          <span style={{ color: 'var(--text-2)' }}>🔍</span>
          <input
            autoFocus
            value={query}
            onChange={handleInput}
            placeholder="搜索店铺/餐厅/咖啡店"
            className="flex-1 bg-transparent py-2.5 outline-none"
            style={{ color: 'var(--text-1)' }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }} style={{ color: 'var(--text-2)', fontSize: 20 }}>×</button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>
            {locating
              ? '正在定位，用于按附近距离排序'
              : searchMode === 'china'
                ? '使用高德搜索中国店铺'
                : searchMode === 'global'
                  ? '使用 Google 搜索海外店铺'
                  : searchOrigin
                    ? '自动选择地图服务，附近店铺优先'
                    : '自动选择地图服务，定位不可用时扩大搜索'}
          </p>
          {!searchOrigin && !locating && (
            <button
              onClick={() => ensureSearchOrigin().then(origin => query && origin && search(query))}
              className="text-[11px] font-semibold active:opacity-70"
              style={{ color }}
            >
              定位到我附近
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {error && (
          <div className="px-5 py-6 rounded-[12px] mx-4 mt-4 text-[13px]"
            style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="px-5 py-5 text-[14px]" style={{ color: 'var(--text-2)' }}>搜索中...</div>
        )}

        {!loading && results.map((s, i) => {
          const main = s.name || ''
          const distance = formatDistance(s.distance)
          const sub  = [distance, s.address, s.district || s.city].filter(Boolean).join(' · ')
          const sourceLabel = s.provider === 'google' ? 'Google' : '高德'
          return (
            <button
              key={s.poiId || s.placeId || i}
              onClick={() => handleSelect(s)}
              className="w-full px-5 py-4 flex items-center gap-3 text-left active:opacity-70 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[20px] flex-shrink-0"
                style={{ background: `${color}18` }}
              >
                ☕
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] truncate" style={{ color: 'var(--text-1)' }}>{main}</p>
                <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>{sub}</p>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${color}14`, color }}
              >
                {sourceLabel}
              </span>
            </button>
          )
        })}

        {!loading && !error && query && results.length === 0 && (
          <div className="py-20 text-center" style={{ color: 'var(--text-2)' }}>
            <p className="text-5xl mb-3">🔍</p>
            <p className="text-[14px]">没有找到"<span style={{ color: 'var(--text-1)' }}>{query}</span>"</p>
          </div>
        )}

        {/* Empty state — no records: original Google search placeholder */}
        {!query && records.length === 0 && (
          <div className="px-5 py-10 text-center" style={{ color: 'var(--text-2)' }}>
            <p className="text-4xl mb-3">📍</p>
            <p className="text-[14px]">输入店名开始搜索</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>数据来源：高德地图</p>
          </div>
        )}

        {/* Empty state — with records: quick-pick shortcuts */}
        {!query && records.length > 0 && (
          <div className="px-5 py-4">
            {recentShops.length > 0 && (
              <>
                <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-2)' }}>最近光顾</p>
                <div className="flex flex-col gap-2 mb-5">
                  {recentShops.map(r => (
                    <button
                      key={`recent-${r.id}`}
                      onClick={() => pickRecorded(r)}
                      className="w-full rounded-[14px] px-4 py-3 text-left active:opacity-70"
                      style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                    >
                      <p className="font-semibold text-[15px] truncate" style={{ color: 'var(--text-1)' }}>{r.shopName}</p>
                      <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>
                        {r.city ? `${r.city} · ` : ''}{formatRelativeDate(r.date)}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {topShops.length > 0 && (
              <>
                <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-2)' }}>常去 Top 3</p>
                <div className="flex flex-col gap-2">
                  {topShops.map(r => (
                    <button
                      key={`top-${r.id}`}
                      onClick={() => pickRecorded(r)}
                      className="w-full rounded-[14px] px-4 py-3 text-left active:opacity-70"
                      style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                    >
                      <p className="font-semibold text-[15px] truncate" style={{ color: 'var(--text-1)' }}>{r.shopName}</p>
                      <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>
                        {r.city ? `${r.city} · ` : ''}共 {r._count} 次
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
