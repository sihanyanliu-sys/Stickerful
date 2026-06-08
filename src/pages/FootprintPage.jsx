import { useSettings } from '../context/SettingsContext'
import StampIcon from '../components/StampIcon'
import { getFunctionIcon } from '../data/labelIcons'

export default function FootprintPage({ navigate, records = [], params = {} }) {
  const { settings } = useSettings()
  const filterCity = params.filterCity || null
  const filterShop = params.filterShop || null
  const filtered = records.filter(r =>
    (!filterCity || r.city === filterCity) && (!filterShop || r.shopName === filterShop)
  )
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  const totalStamps = records.length
  const totalCities = new Set(records.map(r => r.city)).size
  const totalShops  = new Set(records.map(r => r.shopName)).size

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="font-display text-[30px] font-bold tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>我的足迹</h1>
        <p className="text-[14px]" style={{ color: 'var(--text-2)' }}>共 {totalStamps} 枚印章 · {totalCities} 座城市</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: '印章', value: totalStamps, iconId: 'stamp-count', action: null },
            { label: '城市', value: totalCities, iconId: 'city-count',  action: () => navigate('city-list') },
            { label: '店铺', value: totalShops,  iconId: 'shop-count',  action: () => navigate('shop-list') },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action || undefined}
              className="rounded-[16px] pt-4 pb-3 flex flex-col items-center active:opacity-70 transition-opacity"
              style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            >
              <img
                src={getFunctionIcon(item.iconId)}
                alt=""
                className="mb-2"
                style={{ width: 68, height: 68, objectFit: 'contain' }}
                draggable={false}
              />
              <p className="font-display text-[28px] font-bold leading-none" style={{ color: 'var(--text-1)' }}>{item.value}</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-2)' }}>{item.label}</p>
            </button>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold tracking-wide" style={{ color: 'var(--text-2)' }}>
            {filterShop ? `${filterShop} 的记录` : filterCity ? `${filterCity} 的记录` : '全部记录'}
          </p>
          <button onClick={() => navigate('city-list')} className="text-[14px] font-medium active:opacity-60" style={{ color: settings.stampColor }}>
            按城市查看
          </button>
        </div>

        {/* Records */}
        <div className="flex flex-col gap-3">
          {sorted.map(s => (
            <button
              key={s.id}
              onClick={() => navigate('stamp-detail', { stamp: s })}
              className="rounded-[16px] px-4 py-4 flex items-center gap-3 text-left active:opacity-70 transition-opacity"
              style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            >
              <StampIcon emoji={s.emoji} photo={s.photo} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[16px] truncate" style={{ color: 'var(--text-1)' }}>{s.shopName}</p>
                <p className="text-[14px] mt-0.5" style={{ color: 'var(--text-2)' }}>{s.city} · {s.date}</p>
              </div>
              {settings.showRating && (
                <div className="flex gap-0.5 flex-shrink-0">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className="text-[16px]" style={{ color: i < s.rating ? '#FFCC00' : 'var(--border)' }}>★</span>
                  ))}
                </div>
              )}
            </button>
          ))}

          {sorted.length === 0 && (
            <div className="py-16 text-center" style={{ color: 'var(--text-2)' }}>
              <p className="text-5xl mb-3">📮</p>
              <p className="text-[15px]">暂无记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
