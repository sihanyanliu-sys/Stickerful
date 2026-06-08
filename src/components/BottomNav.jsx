import { useSettings } from '../context/SettingsContext'

// SVG line icons — warm, hand-crafted feel matching reference
const ICONS = {
  home: (active, color) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? color : 'currentColor'} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  footprint: (active, color) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? color : 'currentColor'} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3c0 0 3 3.5 3 9s-3 9-3 9"/>
      <path d="M3 12h18"/>
      <path d="M5.5 7h13M5.5 17h13"/>
    </svg>
  ),
  map: (active, color) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? color : 'currentColor'} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  settings: (active, color) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? color : 'currentColor'} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
}

const NAV_ITEMS = [
  { id: 'home',      label: '首页' },
  { id: 'footprint', label: '足迹' },
  { id: 'map',       label: '地图' },
  { id: 'settings',  label: '设置' },
]

export default function BottomNav({ currentPage, navigate }) {
  const { settings } = useSettings()
  const color = settings.stampColor || '#C98D48'

  return (
    <div
      className="flex-none flex items-center border-t"
      style={{
        background: 'var(--nav-bg)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {NAV_ITEMS.map(item => {
        const active = currentPage === item.id
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className="flex-1 flex flex-col items-center py-2 gap-[3px] active:opacity-55 transition-opacity"
            style={{ color: active ? color : 'var(--text-2)' }}
          >
            {ICONS[item.id]?.(active, color)}
            <span
              className="text-[10px] font-semibold tracking-wide"
              style={{ color: active ? color : 'var(--text-3)' }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
