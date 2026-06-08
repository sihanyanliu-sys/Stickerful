import { useSettings } from '../context/SettingsContext'
import StampCard from '../components/StampCard'

// The 4 stamp presets shown in the picker.
// `presetId` is stored in settings.stampPreset to identify the full style.
const today = new Date()
const M = today.toLocaleString('en-US', { month: 'short' }) // "May"
const D = today.getDate()                                   // 13
const Y = today.getFullYear()                               // 2026
const dotDate  = `${String(today.getMonth()+1).padStart(2,'0')}.${D}.${Y}`  // 05.13.2026
const longDate = `${M} ${D}\n${Y}`                                          // "May 13\n2026"

const PRESETS = [
  {
    presetId : 'round-light',
    shape    : 'round',
    theme    : 'light',
    topText  : 'STICKERFUL',
    centerText: longDate,
    bottomText: 'NEW YORK',
    showCup  : false,
    label    : '经典邮戳',
  },
  {
    presetId : 'wave-brown',
    shape    : 'wave',
    theme    : 'brown',
    topText  : 'STICKERFUL',
    centerText: null,
    bottomText: dotDate,
    showCup  : true,
    label    : '波浪贴纸',
  },
  {
    presetId : 'decagon-brown',
    shape    : 'decagon',
    theme    : 'brown',
    topText  : 'STICKERFUL',
    centerText: null,
    bottomText: 'NEW YORK',
    showCup  : true,
    label    : '焦糖徽章',
  },
]

// Morandi-inspired palette — muted, low-chroma earth tones that harmonise with
// the app's warm beige surfaces. Caramel kept as the brand-anchor color.
const COLORS = [
  { label: '焦糖',   value: '#C98D48' },
  { label: '雾蓝',   value: '#7E96AC' },
  { label: '鼠尾草', value: '#8FA37D' },
  { label: '陈玫瑰', value: '#C18B8A' },
  { label: '藕灰',   value: '#A89AA3' },
]

export default function StampSettingsPage({ navigate }) {
  const { settings, updateSetting } = useSettings()

  const selected = settings.stampPreset || 'decagon-light'
  const color    = settings.stampColor  || '#C98D48'

  function handleSelect(preset) {
    updateSetting('stampPreset', preset.presetId)
    // Also keep stampShape / theme in sync for StampArt on detail page
    updateSetting('stampShape', preset.shape)
    updateSetting('stampTheme', preset.theme)
  }

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Nav */}
      <div
        className="flex items-center px-5 pt-14 pb-4 border-b flex-shrink-0"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="text-[#FF9500] font-medium text-[16px] active:opacity-60 mr-3"
        >
          ‹ 返回
        </button>
        <h2 className="font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>
          印章设置
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Stamp count hint ── */}
        <p
          className="text-center text-[14px] mt-6 mb-4"
          style={{ color: 'var(--text-2)' }}
        >
          {PRESETS.length} 印章
        </p>

        {/* ── 4 stamp cards — horizontal scroll on mobile ── */}
        <div
          className="flex gap-5 px-6 pb-2 overflow-x-auto"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {PRESETS.map(preset => (
            <div
              key={preset.presetId}
              className="flex flex-col items-center gap-2 flex-none"
              style={{ scrollSnapAlign: 'start' }}
            >
              <StampCard
                shape={preset.shape}
                theme={preset.theme}
                topText={preset.topText}
                centerText={preset.centerText}
                bottomText={preset.bottomText}
                showCup={preset.showCup}
                selected={selected === preset.presetId}
                onClick={() => handleSelect(preset)}
                size={154}
                color={color}
              />
              <p
                className="text-[12px] font-semibold"
                style={{ color: selected === preset.presetId ? color : 'var(--text-2)' }}
              >
                {preset.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Scroll hint dots ── */}
        <div className="flex justify-center gap-2 mt-4 mb-6">
          {PRESETS.map((p, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width:  selected === p.presetId ? 18 : 6,
                height: 6,
                background: selected === p.presetId ? color : 'var(--border)',
              }}
            />
          ))}
        </div>

        {/* ── Colour picker ── */}
        <div className="px-5 mb-6">
          <p
            className="text-[13px] font-semibold mb-3"
            style={{ color: 'var(--text-2)' }}
          >
            印章颜色
          </p>
          <div
            className="rounded-[16px] px-4 py-4 flex gap-4 items-center"
            style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            {COLORS.map(c => {
              const active = settings.stampColor === c.value
              return (
                <button
                  key={c.value}
                  onClick={() => updateSetting('stampColor', c.value)}
                  className="w-10 h-10 rounded-full active:scale-90 transition-transform flex-none"
                  style={{
                    background: c.value,
                    outline: active ? `3px solid ${c.value}` : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                  title={c.label}
                />
              )
            })}
          </div>
        </div>

        {/* ── Full-size live preview ── */}
        <div className="px-5 mb-8">
          <p
            className="text-[13px] font-semibold mb-3"
            style={{ color: 'var(--text-2)' }}
          >
            当前印章预览
          </p>
          <div
            className="rounded-[20px] overflow-hidden flex items-center justify-center py-6"
            style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            {(() => {
              const preset = PRESETS.find(p => p.presetId === selected) || PRESETS[0]
              return (
                <StampCard
                  shape={preset.shape}
                  theme={preset.theme}
                  topText={preset.topText}
                  centerText={preset.centerText}
                  bottomText={preset.bottomText}
                  showCup={preset.showCup}
                  selected={false}
                  size={190}
                  color={color}
                />
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
