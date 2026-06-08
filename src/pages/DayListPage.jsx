import { useSettings } from '../context/SettingsContext'
import { stickerMap } from '../stickerData'

// ── Day list page: shows all records for a single date ──
// Reached from HomePage when user taps a day with >1 records (month or week view)
export default function DayListPage({ navigate, params = {}, records = [] }) {
  const { settings } = useSettings()
  const color = settings.stampColor || '#C98D48'
  const date = params.date || ''

  // Always re-derive from the latest `records` so deletions update the list
  const dayRecs = records.filter(r => r.date === date)
  // App prepends new records → array is newest-first. Reverse to show earliest first (timeline).
  const sorted = [...dayRecs].reverse()

  // Format date for header
  let dateDisplay = date
  try {
    const d = new Date(date + 'T00:00:00')
    dateDisplay = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  } catch {}

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Nav */}
      <div
        className="flex items-center px-5 pt-14 pb-4 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="text-[#FF9500] font-medium text-[16px] active:opacity-60 mr-4"
        >
          ‹ 返回
        </button>
        <h2 className="flex-1 text-center font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>
          {dateDisplay}
        </h2>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[12px] mb-3" style={{ color: 'var(--text-2)' }}>
          当天共 {sorted.length} 条记录
        </p>

        {sorted.length === 0 ? (
          <p className="text-[14px] mt-12 text-center" style={{ color: 'var(--text-3)' }}>
            这一天没有记录了
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map(r => (
              <button
                key={r.id}
                onClick={() => navigate('stamp-detail', { stamp: r })}
                className="flex items-center gap-3 rounded-[16px] px-4 py-3 active:opacity-70"
                style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
              >
                {/* Sticker thumb */}
                <div
                  style={{
                    width: 56, height: 56, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {r.cutout ? (
                    <img
                      src={r.cutout}
                      alt=""
                      style={{
                        width: '100%', height: '100%', objectFit: 'contain',
                        filter: 'drop-shadow(0 1.5px 4px rgba(44,24,16,0.22))',
                      }}
                    />
                  ) : r.photo ? (
                    <img
                      src={r.photo}
                      alt=""
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        borderRadius: 10, border: '2px solid #fff',
                      }}
                    />
                  ) : stickerMap.has(r.emoji) ? (
                    <img
                      src={stickerMap.get(r.emoji).transparentIcon}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: 32 }}>{r.emoji || '☕'}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-[15px] truncate" style={{ color: 'var(--text-1)' }}>
                    {r.shopName}
                  </p>
                  <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>
                    {r.city || ''}
                    {r.rating > 0 ? `${r.city ? ' · ' : ''}${'★'.repeat(r.rating)}` : ''}
                  </p>
                </div>

                {r.calories > 0 && (
                  <span className="text-[12px] font-semibold flex-shrink-0" style={{ color }}>
                    {r.calories} kcal
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
