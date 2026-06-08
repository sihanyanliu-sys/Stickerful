import { useSettings } from '../context/SettingsContext'

const TEXTURES = [
  { id: 'none',  label: 'Original', desc: '纯色背景' },
  { id: 'paper', label: 'Candy',  desc: '柔雾棉感' },
  { id: 'linen', label: 'Cloudy', desc: '云雾渐变' },
  { id: 'noise', label: 'Dream',  desc: '彩色渐变' },
]

export default function TextureSettingsPage({ navigate }) {
  const { settings, updateSetting } = useSettings()

  // Mirror the dark-detection logic from App.jsx so the hint below matches the
  // condition that actually disables textures at the container level.
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark      = settings.theme === 'dark' || (settings.theme === 'auto' && prefersDark)
  const selectedTextureClass = !isDark && settings.texture !== 'none' ? `texture-${settings.texture}` : ''
  const selectedTexture = TEXTURES.find(tex => tex.id === settings.texture) || TEXTURES[0]

  return (
    <div className={`app-page-bg ${selectedTextureClass} flex flex-col h-full`}>
      {/* Nav */}
      <div className="flex items-center px-5 pt-14 pb-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <button onClick={() => navigate(-1)} className="text-[#FF9500] font-medium text-[16px] active:opacity-60 mr-3">
          ‹ 返回
        </button>
        <h2 className="font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>界面纹理</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[13px] mb-3" style={{ color: 'var(--text-2)' }}>选择背景纹理，立即在全局生效</p>
        {isDark && (
          <p className="text-[12px] mb-3" style={{ color: 'var(--text-3)' }}>
            深色主题下不应用纹理 · 切回浅色主题后此处选择会自动恢复
          </p>
        )}
        <div className={`texture-preview ${selectedTextureClass} rounded-[16px] p-4 mb-4 overflow-hidden shadow-sm`}>
          <div className="rounded-[12px] px-4 py-3" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{selectedTexture.label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>{selectedTexture.desc}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TEXTURES.map(tex => {
            const active = settings.texture === tex.id
            return (
              <button
                key={tex.id}
                onClick={() => updateSetting('texture', tex.id)}
                className="rounded-[16px] overflow-hidden flex flex-col active:scale-95 transition-transform"
                style={{
                  outline: active ? '2px solid #FF9500' : '2px solid transparent',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                {/* Preview swatch */}
                <div
                  className={`texture-preview h-20 ${tex.id === 'none' ? '' : `texture-${tex.id}`}`}
                />
                {/* Label */}
                <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: 'var(--surface)' }}>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{tex.label}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>{tex.desc}</p>
                  </div>
                  {active && <span className="text-[#FF9500] text-[16px]">✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
