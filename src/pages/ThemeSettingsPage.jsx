import { useSettings } from '../context/SettingsContext'

const THEMES = [
  { id: 'light', label: '浅色模式', desc: '始终使用浅色界面', icon: '☀️' },
  { id: 'dark',  label: '深色模式', desc: '始终使用深色界面', icon: '🌙' },
  { id: 'auto',  label: '跟随系统', desc: '根据设备自动切换', icon: '🌗' },
]

export default function ThemeSettingsPage({ navigate }) {
  const { settings, updateSetting } = useSettings()

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Nav */}
      <div className="flex items-center px-5 pt-14 pb-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <button onClick={() => navigate(-1)} className="text-[#FF9500] font-medium text-[16px] active:opacity-60 mr-3">
          ‹ 返回
        </button>
        <h2 className="font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>自动主题</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[13px] mb-3" style={{ color: 'var(--text-2)' }}>选择后立即在全局生效</p>

        <div className="rounded-[16px] overflow-hidden divide-y" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => updateSetting('theme', t.id)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left active:opacity-70"
            >
              <span className="text-[28px]">{t.icon}</span>
              <div className="flex-1">
                <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{t.label}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>{t.desc}</p>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: settings.theme === t.id ? '#FF9500' : 'var(--border)',
                  background:  settings.theme === t.id ? '#FF9500' : 'transparent',
                }}
              >
                {settings.theme === t.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
