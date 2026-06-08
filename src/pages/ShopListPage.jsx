import { useSettings } from '../context/SettingsContext'
import StampIcon from '../components/StampIcon'

export default function ShopListPage({ navigate, records = [] }) {
  const { settings } = useSettings()

  const shopMap = records.reduce((acc, r) => {
    const key = r.shopName
    if (!acc[key]) acc[key] = { shopName: r.shopName, city: r.city, emoji: r.emoji, photo: r.photo, count: 0, lastDate: r.date }
    acc[key].count++
    if (r.date > acc[key].lastDate) {
      acc[key].lastDate = r.date
      acc[key].photo = r.photo
      acc[key].emoji = r.emoji
    }
    return acc
  }, {})

  const shops = Object.values(shopMap).sort((a, b) => b.count - a.count)

  return (
    <div className="app-page-bg flex flex-col h-full">
      <div
        className="flex items-center px-5 pt-14 pb-4 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <button onClick={() => navigate(-1)} className="font-medium text-[16px] active:opacity-60 mr-4" style={{ color: settings.stampColor }}>
          ‹ 返回
        </button>
        <h2 className="font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>店铺列表</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-2)' }}>共 {shops.length} 家店铺</p>
        <div className="flex flex-col gap-3">
          {shops.map(shop => (
            <button
              key={shop.shopName}
              onClick={() => navigate('footprint', { filterCity: null, filterShop: shop.shopName })}
              className="rounded-[16px] px-4 py-4 flex items-center gap-4 active:opacity-70 transition-opacity text-left"
              style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
            >
              <StampIcon emoji={shop.emoji} photo={shop.photo} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[16px] truncate" style={{ color: 'var(--text-1)' }}>{shop.shopName}</p>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-2)' }}>{shop.city} · 最近 {shop.lastDate}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-display text-[24px] font-bold" style={{ color: settings.stampColor }}>{shop.count}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>次打卡</p>
              </div>
            </button>
          ))}

          {shops.length === 0 && (
            <div className="py-20 text-center" style={{ color: 'var(--text-2)' }}>
              <p className="text-5xl mb-3">☕</p>
              <p className="text-[15px]">还没有店铺记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
