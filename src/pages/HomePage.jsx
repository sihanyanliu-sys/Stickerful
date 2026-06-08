import { useState, useEffect } from 'react'
import { useSettings } from '../context/SettingsContext'
import StampIcon from '../components/StampIcon'
import { stickerMap } from '../stickerData'

// ── Tight-crop cutout PNGs to their alpha bbox ─────────────────────────────
// Source PNGs from removeBackground.js have variable transparent padding because
// the subject's size within the original photo varies. This makes stickers look
// inconsistently sized when rendered in fixed cells. We compute the alpha bbox
// once per src and emit a re-cropped data URL with just a tiny padding, so
// "subject fills sticker" across all uploads. Cached in-memory.
const tightCropCache    = new Map()  // src → tightSrc (or same src if already tight / failed)
const tightCropPending  = new Map()  // src → Promise<tightSrc>

function getTightCutout(src) {
  if (!src) return Promise.resolve(src)
  if (tightCropCache.has(src))   return Promise.resolve(tightCropCache.get(src))
  if (tightCropPending.has(src)) return tightCropPending.get(src)

  const promise = new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      try {
        const { data } = ctx.getImageData(0, 0, W, H)
        let minX = W, minY = H, maxX = -1, maxY = -1
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (data[(y * W + x) * 4 + 3] > 8) {
              if (x < minX) minX = x
              if (y < minY) minY = y
              if (x > maxX) maxX = x
              if (y > maxY) maxY = y
            }
          }
        }
        if (maxX < 0) { tightCropCache.set(src, src); resolve(src); return }

        const pad    = Math.round(Math.min(W, H) * 0.03)
        const left   = Math.max(0, minX - pad)
        const top    = Math.max(0, minY - pad)
        const right  = Math.min(W, maxX + 1 + pad)
        const bottom = Math.min(H, maxY + 1 + pad)
        const cw = right - left, ch = bottom - top

        // Already tight enough — skip re-encode to save memory / data-URL cost
        if ((cw * ch) / (W * H) > 0.92) {
          tightCropCache.set(src, src); resolve(src); return
        }

        const out = document.createElement('canvas')
        out.width = cw; out.height = ch
        out.getContext('2d').drawImage(c, left, top, cw, ch, 0, 0, cw, ch)
        const url = out.toDataURL('image/png')
        tightCropCache.set(src, url)
        resolve(url)
      } catch {
        tightCropCache.set(src, src); resolve(src)
      }
    }
    img.onerror = () => { tightCropCache.set(src, src); resolve(src) }
    img.src = src
  })

  tightCropPending.set(src, promise)
  return promise
}

function useTightCutout(src) {
  const [tight, setTight] = useState(() => tightCropCache.get(src) || src)
  useEffect(() => {
    if (!src) return
    let cancelled = false
    getTightCutout(src).then(url => {
      if (!cancelled) setTight(url)
    })
    return () => { cancelled = true }
  }, [src])
  return tight
}

// <img>-equivalent that renders the tight-cropped cutout once ready.
function CutoutImg({ src, alt = '', style }) {
  const tight = useTightCutout(src)
  return <img src={tight} alt={alt} style={style} draggable={false} />
}

function StickerImg({ emoji, size = 28, padding = 4 }) {
  const s = stickerMap.get(emoji)
  if (!s) return emoji
  return <img src={s.transparentIcon} alt={s.label} style={{ width: size - padding * 2, height: size - padding * 2, objectFit: 'contain' }} draggable={false} />
}

const DAYS = ['日', '一', '二', '三', '四', '五', '六']

function getWeekDates() {
  const today = new Date()
  const day = today.getDay()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - day + i)
    return d
  })
}

function getMonthDates(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

// Local-timezone date string — see utils/date.js for why toISOString is wrong here
function toDateStr(d) {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Positions for up to 4 stickers in a 136×104 container
// Horizontal row of stickers — each cutout is rendered in a fixed square
// "icon box" so the whole sticker reads as the same visual size regardless of
// underlying aspect ratio.
// Total stack width is capped at STACK_W; icon size and overlap shrink as the
// number of items grows so we never push the left-column text aside.
//   box * n - overlap * (n - 1) ≤ STACK_W,  overlap = box * OVERLAP_RATIO
//   ⇒ box = STACK_W / (n * (1 - OVERLAP_RATIO) + OVERLAP_RATIO)
// With cap ICON_BOX_MAX (n ≤ 3 keeps the larger size).
const ROW_ROTS      = [-6, 3, -4, 5, -2]
const ICON_BOX_MAX  = 64
const OVERLAP_RATIO = 0.22
const STACK_W       = 180
const MAX_ICONS     = 5
function StickerStack({ recs, color }) {
  const shown = recs.slice(0, MAX_ICONS)
  const n     = shown.length
  if (n === 0) return null

  const fitBox = STACK_W / (n * (1 - OVERLAP_RATIO) + OVERLAP_RATIO)
  const box   = Math.min(ICON_BOX_MAX, fitBox)
  const overlap = box * OVERLAP_RATIO

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: ICON_BOX_MAX + 12, flexShrink: 0 }}>
      {shown.map((r, i) => {
        const rot   = ROW_ROTS[i] ?? 0
        const z     = 10 + (i % 2 === 0 ? 1 : 0)
        const boxStyle = {
          width:  box,
          height: box,
          marginLeft: i === 0 ? 0 : -overlap,
          transform:  `rotate(${rot}deg)`,
          position:   'relative',
          zIndex:     z,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }

        if (r.cutout) {
          return (
            <div key={r.id} style={boxStyle}>
              <img
                src={r.cutout}
                alt=""
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 3px 8px rgba(44,24,16,0.22))',
                }}
              />
            </div>
          )
        }

        return (
          <div key={r.id} style={boxStyle}>
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 10,
                overflow: 'hidden',
                border: '3px solid #ffffff',
                boxShadow: '0 3px 10px rgba(44,24,16,0.18)',
                background: r.photo ? '#fff' : `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {r.photo
                ? <img src={r.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <StickerImg emoji={r.emoji} size={box} padding={6} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Period summary card (week or month) ──
function SummaryCard({ label, recs, color, onViewAll }) {
  // Custom-entered shops all share shopId='custom', so dedupe those by name.
  const shops  = new Set(recs.map(r => r.shopId && r.shopId !== 'custom' ? r.shopId : r.shopName)).size
  const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="rounded-[20px] px-5 py-4 mb-3 overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between">
        {/* Left: stats */}
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[12px] font-semibold tracking-widest mb-1" style={{ color: 'var(--text-2)' }}>
            {label}
          </p>
          {/* w-fit shrinks to "N 条记录" width so the shop-count line below
              can text-align center under it (instead of vs. the whole card). */}
          <div className="w-fit mb-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[44px] font-bold leading-none" style={{ color: 'var(--text-1)' }}>
                {recs.length}
              </span>
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-2)' }}>条记录</span>
            </div>
            <div className="text-center mt-1">
              <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>{shops} 家店</span>
            </div>
          </div>

          {recs.length === 0 && (
            <p className="text-[13px] mt-2" style={{ color: 'var(--text-3)' }}>暂无记录，快去打卡吧 ☕</p>
          )}

          <button
            onClick={onViewAll}
            className="mt-4 text-[13px] font-semibold active:opacity-60 whitespace-nowrap"
            style={{ color }}
          >
            查看全部记录 ›
          </button>
        </div>

        {/* Right: sticker fan */}
        <StickerStack recs={sorted} color={color} />
      </div>
    </div>
  )
}

// ── Today calorie card (AI placeholder) ──
function CalorieCard({ todayRecs, color, calorieTarget, macroTargets }) {
  const totalCal   = todayRecs.reduce((s, r) => s + (r.calories  || 0), 0)
  const totalCarbs = todayRecs.reduce((s, r) => s + (r.carbs     || 0), 0)
  const totalProt  = todayRecs.reduce((s, r) => s + (r.protein   || 0), 0)
  const totalFat   = todayRecs.reduce((s, r) => s + (r.fat       || 0), 0)
  const hasData    = totalCal > 0

  // Targets from user settings (set via onboarding / preferences)
  const CAL_TARGET   = calorieTarget
  const MACRO_TARGET = macroTargets

  function MacroBar({ label, value, target, col }) {
    const pct = Math.min((value / target) * 100, 100)
    return (
      <div className="flex-1">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>{label}</span>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-1)' }}>
            {hasData ? `${value}g` : '--'}
          </span>
        </div>
        <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: col }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[20px] px-5 py-4 mb-3" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold tracking-widest" style={{ color: 'var(--text-2)' }}>
          今日热量
        </p>
        {!hasData && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${color}18`, color }}
          >
            AI 接入后自动统计
          </span>
        )}
      </div>

      {/* Calorie ring + number */}
      <div className="flex items-center gap-4 mb-4">
        {/* Mini ring chart */}
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="6"/>
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={color} strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - Math.min(totalCal / CAL_TARGET, 1))}`}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '32px 32px', transition: 'stroke-dashoffset 0.5s' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-1)' }}>
              {hasData ? `${Math.round((totalCal / CAL_TARGET) * 100)}%` : '--'}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-[36px] font-bold leading-none" style={{ color: 'var(--text-1)' }}>
              {hasData ? totalCal : '--'}
            </span>
            <span className="text-[14px]" style={{ color: 'var(--text-2)' }}>kcal</span>
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>
            目标 {CAL_TARGET} kcal
          </p>
        </div>
      </div>

      {/* Macro bars */}
      <div className="flex gap-3">
        <MacroBar label="碳水" value={totalCarbs} target={MACRO_TARGET.carbs} col="#F5A623"/>
        <MacroBar label="蛋白质" value={totalProt}  target={MACRO_TARGET.protein} col="#5B8A5F"/>
        <MacroBar label="脂肪"  value={totalFat}   target={MACRO_TARGET.fat}     col="#C98D48"/>
      </div>

      {/* Today's records mini row */}
      {todayRecs.length > 0 && (
        <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          {todayRecs.slice(0, 6).map(r => (
            <div key={r.id} style={{
              width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
              background: `${color}18`, border: `1.5px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>
              {r.photo
                ? <img src={r.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <StickerImg emoji={r.emoji} size={32} padding={3} />}
            </div>
          ))}
          <span className="text-[12px] self-center ml-1" style={{ color: 'var(--text-2)' }}>
            今日 {todayRecs.length} 条
          </span>
        </div>
      )}
    </div>
  )
}

// ── Week strip with vertical sticker stack per day ──
// Layout: rounded container, max-height = sticky header + 5 sticker rows.
// More records per day → vertical scroll inside the container.
// Newest sticker on top of each column. Click sticker → record detail.
function WeekStripWithStickers({ weekDates, recordsByDate, todayStr, color, navigate, handleDayPress }) {
  const CELL  = 36           // sticker size = date-circle size
  const GAP   = 4            // vertical gap between stickers
  const HEAD  = 12 + 6 + CELL + 6   // top pad + weekday + gap + circle + bottom pad ≈ 60
  const VIS   = 5            // visible sticker rows before scroll
  const maxH  = HEAD + VIS * CELL + (VIS - 1) * GAP + 10  // + bottom container pad

  return (
    <div
      className="rounded-[20px] mt-2 mb-6 overflow-y-auto"
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        maxHeight: maxH,
        paddingLeft: 6, paddingRight: 6, paddingBottom: 10,
      }}
    >
      <div className="grid grid-cols-7" style={{ columnGap: 4 }}>
        {weekDates.map((d, i) => {
          const dateStr = toDateStr(d)
          // App.jsx addRecord prepends → array is already newest-first; render as-is
          const dayRecs = recordsByDate[dateStr] || []
          const isToday = dateStr === todayStr

          return (
            <div key={i} className="flex flex-col items-center" style={{ rowGap: GAP }}>
              {/* Sticky weekday + date header */}
              <div
                style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  background: 'var(--surface)',
                  width: '100%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  paddingTop: 12, paddingBottom: 6, rowGap: 6,
                }}
              >
                <span className="text-[12px]" style={{ color: 'var(--text-2)' }}>{DAYS[i]}</span>
                <button
                  onClick={() => handleDayPress(dateStr)}
                  className="rounded-full flex items-center justify-center text-[15px] font-semibold active:opacity-60"
                  style={{
                    width: CELL, height: CELL,
                    background: isToday ? color : 'transparent',
                    color:      isToday ? '#fff' : 'var(--text-1)',
                  }}
                >
                  {d.getDate()}
                </button>
              </div>

              {/* Vertical sticker stack — newest first */}
              {dayRecs.map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate('stamp-detail', { stamp: r })}
                  className="active:opacity-60"
                  style={{
                    width: CELL, height: CELL,
                    padding: 0, border: 'none', background: 'transparent',
                    flexShrink: 0,
                  }}
                >
                  {r.cutout ? (
                    <CutoutImg
                      src={r.cutout}
                      style={{
                        width: '100%', height: '100%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 1.5px 4px rgba(44,24,16,0.22))',
                      }}
                    />
                  ) : r.photo ? (
                    <img
                      src={r.photo}
                      alt=""
                      style={{
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '2px solid #fff',
                        boxShadow: '0 1.5px 4px rgba(44,24,16,0.18)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%', height: '100%',
                        borderRadius: 8,
                        background: `${color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <StickerImg emoji={r.emoji} size={CELL} padding={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ──
export default function HomePage({ navigate, records = [] }) {
  const { settings } = useSettings()
  const [view, setView] = useState('week')
  const today    = new Date()
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const weekDates = getWeekDates()
  const todayStr  = toDateStr(today)
  const color         = settings.stampColor || '#C98D48'
  const calorieTarget = settings.calorieTarget || 2000
  const macroTargets  = settings.macroTargets  || { carbs: 250, protein: 60, fat: 65 }

  const recordsByDate = records.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {})

  // Period stats
  const weekStrs  = weekDates.map(d => toDateStr(d))
  const weekRecs  = records.filter(r => weekStrs.includes(r.date))
  const monthStr  = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
  const monthRecs = records.filter(r => r.date.startsWith(monthStr))
  const todayRecs = recordsByDate[todayStr] || []

  function handleDayPress(dateStr) {
    const dayRecs = recordsByDate[dateStr] || []
    if (dayRecs.length === 0)      navigate('add-record',  { defaultDate: dateStr })
    else if (dayRecs.length === 1) navigate('stamp-detail', { stamp: dayRecs[0] })
    else                            navigate('day-list',    { date: dateStr })
  }

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-brand text-[32px] font-semibold tracking-tight" style={{ color: 'var(--brand-text)' }}>Stickerful</h1>
          <button
            onClick={() => navigate('settings')}
            className="w-10 h-10 rounded-full flex items-center justify-center active:opacity-70"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
          >
            <span className="text-[20px]" style={{ color: 'var(--text-2)' }}>⚙</span>
          </button>
        </div>

        {/* View toggle */}
        <div className="flex rounded-[12px] p-1 w-fit" style={{ background: 'var(--surface)' }}>
          {['week', 'month'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-5 py-1.5 rounded-[9px] text-[15px] font-medium transition-all"
              style={view === v
                ? { background: 'white', boxShadow: `0 0 0 1.5px ${color}`, color }
                : { color: 'var(--text-2)' }
              }
            >
              {v === 'week' ? '本周' : '本月'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === 'week' ? (
          <div className="px-5 pb-8">
            {/* Week strip — sticky weekday header + vertical sticker stack per day */}
            <WeekStripWithStickers
              weekDates={weekDates}
              recordsByDate={recordsByDate}
              todayStr={todayStr}
              color={color}
              navigate={navigate}
              handleDayPress={handleDayPress}
            />

            {/* Summary cards */}
            <SummaryCard
              label="本周概览"
              recs={weekRecs}
              color={color}
              onViewAll={() => navigate('footprint')}
            />
            <CalorieCard todayRecs={todayRecs} color={color} calorieTarget={calorieTarget} macroTargets={macroTargets} />
          </div>

        ) : (
          <div className="px-5 mt-2 pb-8">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => {
                  if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
                  else setCalMonth(m => m - 1)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full active:opacity-60"
                style={{ background: 'var(--surface)', color: 'var(--text-2)' }}>‹</button>
              <span className="font-semibold text-[15px]" style={{ color: 'var(--text-1)' }}>
                {calYear}年{calMonth + 1}月
              </span>
              <button onClick={() => {
                  if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
                  else setCalMonth(m => m + 1)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full active:opacity-60"
                style={{ background: 'var(--surface)', color: 'var(--text-2)' }}>›</button>
            </div>

            {/* Day header */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <span key={d} className="text-center text-[12px]" style={{ color: 'var(--text-2)' }}>{d}</span>
              ))}
            </div>

            {/* Month grid — tile per day; cutout sticker fills day when records exist */}
            <div className="grid grid-cols-7 mb-5" style={{ rowGap: 6, columnGap: 4 }}>
              {getMonthDates(calYear, calMonth).map((d, i) => {
                if (!d) return <div key={`e${i}`} />
                const dateStr = toDateStr(d)
                const dayRecs = recordsByDate[dateStr] || []
                // App prepends → array is newest-first; "first uploaded" = last element (earliest)
                const firstRec = dayRecs.length > 0 ? dayRecs[dayRecs.length - 1] : null
                const count    = dayRecs.length
                const isToday  = dateStr === todayStr

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDayPress(dateStr)}
                    className="relative active:opacity-60"
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 12,
                      background: isToday ? `${color}26` : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 2,
                    }}
                  >
                    {firstRec ? (
                      firstRec.cutout ? (
                        <CutoutImg
                          src={firstRec.cutout}
                          style={{
                            width: '100%', height: '100%', objectFit: 'contain',
                            filter: 'drop-shadow(0 1.5px 4px rgba(44,24,16,0.22))',
                          }}
                        />
                      ) : firstRec.photo ? (
                        <img
                          src={firstRec.photo}
                          alt=""
                          style={{
                            width: '86%', height: '86%', objectFit: 'cover',
                            borderRadius: 8,
                            border: '2px solid #fff',
                            boxShadow: '0 1.5px 4px rgba(44,24,16,0.18)',
                          }}
                        />
                      ) : (
                        <StickerImg emoji={firstRec.emoji} size={36} padding={4} />
                      )
                    ) : (
                      <span className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
                        {d.getDate()}
                      </span>
                    )}

                    {/* Count badge — only shown when more than 1 record */}
                    {count > 1 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: -3, right: -3,
                          minWidth: 18, height: 18,
                          padding: '0 5px',
                          borderRadius: 9,
                          background: 'var(--surface)',
                          color: 'var(--text-1)',
                          fontSize: 11,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(44,24,16,0.22)',
                          lineHeight: 1,
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Summary cards */}
            <SummaryCard
              label="本月概览"
              recs={monthRecs}
              color={color}
              onViewAll={() => navigate('footprint')}
            />
            <CalorieCard todayRecs={todayRecs} color={color} calorieTarget={calorieTarget} macroTargets={macroTargets} />
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('add-record', {})}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full flex items-center justify-center text-white text-3xl font-light active:scale-95 transition-transform"
        style={{ background: color, boxShadow: `0 4px 12px ${color}66` }}
      >
        +
      </button>
    </div>
  )
}
