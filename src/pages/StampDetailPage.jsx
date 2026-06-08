import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import StampArt from '../components/StampArt'

export default function StampDetailPage({ navigate, params = {}, records = [], deleteRecord }) {
  const { settings } = useSettings()
  const color = settings.stampColor || '#C98D48'
  const stamp = params.stamp

  const [menuOpen,    setMenuOpen]    = useState(false)
  const [shareOpen,   setShareOpen]   = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)

  if (!stamp) {
    return (
      <div className="app-page-bg flex flex-col h-full">
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
            印章详情
          </h2>
          <div className="w-8" />
        </div>
        <div className="flex-1 flex items-center justify-center px-8 text-center">
          <p className="text-[15px]" style={{ color: 'var(--text-2)' }}>这条记录不存在。</p>
        </div>
      </div>
    )
  }

  const sameShop = records.filter(r => r.shopName === stamp.shopName && r.id !== stamp.id)

  function handleDelete() {
    deleteRecord?.(stamp.id)
    navigate(-1)
  }

  function handleShare() {
    setMenuOpen(false)
    setShareOpen(true)
  }

  // Try Web Share API; fall back to the share card overlay
  function tryNativeShare() {
    const text = [
      `📍 ${stamp.shopName}${stamp.city ? ' · ' + stamp.city : ''}`,
      `📅 ${stamp.date}`,
      stamp.rating ? `${'★'.repeat(stamp.rating)}` : '',
      stamp.note || '',
      stamp.calories > 0 ? `🔥 ${stamp.calories} kcal` : '',
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      navigator.share({ title: stamp.shopName, text }).catch(() => {})
    }
  }

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
          印章详情
        </h2>
        <button
          onClick={() => setMenuOpen(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] active:opacity-60 outline-none"
          style={{ color: 'var(--text-2)' }}
        >···</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* Stamp art */}
        <div className="flex justify-center mb-5">
          <div className="rounded-[20px] overflow-hidden" style={{ boxShadow: `0 8px 24px ${color}33` }}>
            <StampArt
              shape={settings.stampShape}
              color={color}
              shopName={stamp.shopName}
              date={stamp.date}
              emoji={stamp.emoji}
              photo={stamp.photo || null}
              cutout={stamp.cutout || null}
              size={220}
            />
          </div>
        </div>

        {/* Rating */}
        {settings.showRating && (
          <div className="flex justify-center gap-1 mb-5">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="text-[24px]" style={{ color: i < stamp.rating ? '#FFCC00' : 'var(--border)' }}>★</span>
            ))}
          </div>
        )}

        {/* Food photo */}
        {stamp.photo && (
          <div className="rounded-[20px] overflow-hidden mb-5" style={{ aspectRatio: '4/3' }}>
            <img src={stamp.photo} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Info cards */}
        <div className="flex flex-col gap-3">
          <div className="rounded-[16px] px-4 py-4" style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <p className="text-[12px] mb-1" style={{ color: 'var(--text-2)' }}>打卡日期</p>
            <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{stamp.date}</p>
          </div>

          {stamp.note ? (
            <div className="rounded-[16px] px-4 py-4" style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <p className="text-[12px] mb-1" style={{ color: 'var(--text-2)' }}>备注</p>
              <p style={{ color: 'var(--text-1)' }}>{stamp.note}</p>
            </div>
          ) : null}

          {stamp.calories > 0 && (
            <div className="rounded-[16px] px-4 py-4" style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <p className="text-[12px] mb-3" style={{ color: 'var(--text-2)' }}>
                营养信息{stamp.dishName ? ` · ${stamp.dishName}` : ''}
              </p>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="font-display font-bold text-[36px] leading-none" style={{ color }}>{stamp.calories}</span>
                <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>kcal</span>
              </div>
              <div className="flex gap-3">
                {[
                  { label: '碳水', value: stamp.carbs, col: '#F5A623' },
                  { label: '蛋白质', value: stamp.protein, col: '#5B8A5F' },
                  { label: '脂肪', value: stamp.fat, col: color },
                ].map(m => (
                  <div key={m.label} className="flex-1 text-center py-2 rounded-[10px]" style={{ background: 'var(--bg)' }}>
                    <p className="font-semibold text-[15px]" style={{ color: m.col }}>{m.value}g</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sameShop.length > 0 && (
            <div className="rounded-[16px] px-4 py-4" style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <p className="text-[12px] mb-3" style={{ color: 'var(--text-2)' }}>同店其他记录</p>
              <div className="flex flex-col gap-2">
                {sameShop.map(r => (
                  <button key={r.id} onClick={() => navigate('stamp-detail', { stamp: r })} className="flex items-center gap-3 active:opacity-60">
                    <span className="text-lg">{r.emoji}</span>
                    <span className="flex-1 text-[14px]" style={{ color: 'var(--text-1)' }}>{r.date}</span>
                    <span className="text-[13px]" style={{ color: '#FFCC00' }}>{'★'.repeat(r.rating)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex gap-3 mt-5 pb-2">
          <button
            onClick={() => navigate('add-record', { stamp })}
            className="flex-1 py-3.5 rounded-[14px] font-semibold active:opacity-70"
            style={{ background: `${color}20`, color }}
          >编辑</button>
          <button
            onClick={handleShare}
            className="flex-1 py-3.5 rounded-[14px] font-semibold active:opacity-70"
            style={{ background: 'var(--surface)', color: 'var(--text-2)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >分享</button>
        </div>
      </div>

      {/* ── Three-dots menu sheet ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => { setMenuOpen(false); setConfirmDel(false) }}>
          <div
            className="rounded-t-[24px] pb-8 pt-2 px-5"
            style={{ background: 'var(--surface)', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-8 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--border)' }} />

            <button
              onClick={handleShare}
              className="w-full flex items-center gap-4 py-4 border-b active:opacity-60"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-[22px]">✈️</span>
              <div className="text-left">
                <p className="font-semibold text-[15px]" style={{ color: 'var(--text-1)' }}>分享印章</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>生成卡片，截图分享给朋友</p>
              </div>
            </button>

            {!confirmDel ? (
              <button
                onClick={() => setConfirmDel(true)}
                className="w-full flex items-center gap-4 py-4 active:opacity-60"
              >
                <span className="text-[22px]">🗑️</span>
                <p className="font-semibold text-[15px]" style={{ color: '#FF3B30' }}>删除记录</p>
              </button>
            ) : (
              <div className="py-4">
                <p className="text-[14px] mb-3" style={{ color: 'var(--text-2)' }}>确定要删除这条记录吗？此操作不可撤销。</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDel(false)}
                    className="flex-1 py-3 rounded-[12px] font-semibold active:opacity-70"
                    style={{ background: 'var(--bg)', color: 'var(--text-2)' }}
                  >取消</button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-3 rounded-[12px] font-semibold active:opacity-70"
                    style={{ background: '#FF3B30', color: '#fff' }}
                  >确认删除</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Share card overlay ── */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          {/* Card */}
          <div
            className="rounded-[28px] mx-6 overflow-hidden"
            style={{ background: '#FFFCF8', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', maxWidth: 320, width: '100%' }}
          >
            {/* Photo banner */}
            {stamp.photo && (
              <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                <img src={stamp.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            {/* Stamp + info */}
            <div className="flex flex-col items-center px-6 py-5 gap-3">
              <StampArt
                shape={settings.stampShape}
                color={color}
                shopName={stamp.shopName}
                date={stamp.date}
                emoji={stamp.emoji}
                photo={stamp.photo || null}
                cutout={stamp.cutout || null}
                size={160}
              />

              <div className="text-center">
                <p className="font-display font-bold text-[20px]" style={{ color: '#2C1810' }}>{stamp.shopName}</p>
                {stamp.city && <p className="text-[13px] mt-0.5" style={{ color: '#8B6A50' }}>{stamp.city} · {stamp.date}</p>}
              </div>

              {stamp.rating > 0 && (
                <p className="text-[18px] tracking-wide" style={{ color: '#FFCC00' }}>{'★'.repeat(stamp.rating)}{'☆'.repeat(5 - stamp.rating)}</p>
              )}

              {stamp.note && (
                <p className="text-[13px] text-center italic" style={{ color: '#8B6A50' }}>"{stamp.note}"</p>
              )}

              {stamp.calories > 0 && (
                <div className="flex gap-4 py-2 px-4 rounded-[14px] w-full justify-center" style={{ background: `${color}12` }}>
                  <span className="text-[13px] font-semibold" style={{ color }}>{stamp.calories} kcal</span>
                  <span className="text-[13px]" style={{ color: '#8B6A50' }}>碳水 {stamp.carbs}g · 蛋白 {stamp.protein}g · 脂肪 {stamp.fat}g</span>
                </div>
              )}

              <p className="text-[11px] mt-1" style={{ color: '#C4A882' }}>via Stickerful ✦</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5 mx-6 w-full" style={{ maxWidth: 320 }}>
            {navigator.share && (
              <button
                onClick={tryNativeShare}
                className="flex-1 py-3.5 rounded-[14px] font-semibold active:opacity-70 text-[15px]"
                style={{ background: color, color: '#fff' }}
              >分享</button>
            )}
            <button
              onClick={() => setShareOpen(false)}
              className="flex-1 py-3.5 rounded-[14px] font-semibold active:opacity-70 text-[15px]"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >{navigator.share ? '关闭' : '截图保存后关闭'}</button>
          </div>
          {!navigator.share && (
            <p className="text-[12px] mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>长按卡片可保存图片</p>
          )}
        </div>
      )}
    </div>
  )
}
