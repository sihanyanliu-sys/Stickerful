import { getCityIcon } from '../data/labelIcons'
import { stickerMap } from '../stickerData'

// Fallback emoji map for cities not present in label-icon-manifest.
// Catch-all is 🏙️.
const CITY_EMOJI_FALLBACK = {
  'San Francisco': '🌉',
  Portland: '🌲',
  Chicago: '🏙️',
  'New York': '🗽',
  Tokyo: '🗼',
}

export default function CityListPage({ navigate, records = [] }) {
  // Derive cities from live records
  const cityMap = records.reduce((acc, r) => {
    if (!acc[r.city]) acc[r.city] = { name: r.city, count: 0, emojis: [] }
    acc[r.city].count++
    if (!acc[r.city].emojis.includes(r.emoji)) acc[r.city].emojis.push(r.emoji)
    return acc
  }, {})

  const cities = Object.values(cityMap).sort((a, b) => b.count - a.count)
  function renderStickerPreview(id) {
    const sticker = stickerMap.get(id)
    if (sticker) {
      return (
        <img
          key={id}
          src={sticker.transparentIcon}
          alt={sticker.label}
          style={{ width: 22, height: 22, objectFit: 'contain' }}
          draggable={false}
        />
      )
    }
    return <span key={id} className="text-[18px] leading-none">{id}</span>
  }

  return (
    <div className="app-page-bg flex flex-col h-full">
      <div className="flex items-center px-5 pt-14 pb-4 bg-white border-b border-[#E5E5EA]">
        <button onClick={() => navigate(-1)} className="text-[#FF9500] font-medium text-[16px] active:opacity-60 mr-4">
          ‹ 返回
        </button>
        <h2 className="font-semibold text-[#1C1C1E] text-[17px]">城市足迹</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[13px] text-[#8E8E93] mb-4">共解锁 {cities.length} 座城市</p>
        <div className="flex flex-col gap-3">
          {cities.map(city => {
            const iconPath = getCityIcon(city.name)
            return (
              <button
                key={city.name}
                onClick={() => navigate('footprint', { filterCity: city.name })}
                className="bg-white rounded-[16px] px-4 py-4 flex items-center gap-4 active:opacity-70 transition-opacity text-left"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
              >
                {iconPath ? (
                  <img
                    src={iconPath}
                    alt=""
                    style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }}
                    draggable={false}
                  />
                ) : (
                  <span className="text-[32px]" style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                    {CITY_EMOJI_FALLBACK[city.name] || '🏙️'}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1C1C1E] text-[16px] truncate">{city.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 min-h-[22px]">
                    {city.emojis.slice(0, 3).map(renderStickerPreview)}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-[24px] font-bold text-[#FF9500]">{city.count}</p>
                  <p className="text-[11px] text-[#8E8E93]">印章</p>
                </div>
              </button>
            )
          })}

          {cities.length === 0 && (
            <div className="py-20 text-center text-[#8E8E93]">
              <p className="text-5xl mb-3">🗺️</p>
              <p className="text-[15px]">还没有城市记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
