import { useSettings } from '../context/SettingsContext'

// Custom warm-ivory + caramel line-art icons (each SVG is self-contained with its own
// circular background, so no extra wrapper needed here).
const MENU_ITEMS = [
  { label: '个人信息', icon: '/assets/settings-icons/profile.svg',     page: 'profile' },
  { label: '偏好设置', icon: '/assets/settings-icons/preferences.svg', page: 'preferences' },
  { label: '印章设置', icon: '/assets/settings-icons/stamp.svg',       page: 'stamp-settings' },
  { label: '界面纹理', icon: '/assets/settings-icons/texture.svg',     page: 'texture-settings' },
  { label: '通用设置', icon: '/assets/settings-icons/general.svg',     page: 'general-settings' },
  { label: '自动主题', icon: '/assets/settings-icons/auto-theme.svg',  page: 'theme-settings' },
]

export default function SettingsPage({ navigate }) {
  const { settings } = useSettings()

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h1 className="text-[28px] font-bold tracking-tight mb-5" style={{ color: 'var(--text-1)' }}>设置</h1>
        <button
          onClick={() => navigate('profile')}
          className="flex items-center gap-4 w-full active:opacity-70"
        >
          <div className="w-16 h-16 rounded-full bg-[#FFF0DB] flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
            {typeof settings.userAvatar === 'string' && settings.userAvatar.startsWith('data:')
              ? <img src={settings.userAvatar} alt="头像" className="w-full h-full object-cover" />
              : settings.userAvatar}
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-[18px]" style={{ color: 'var(--text-1)' }}>{settings.userName}</p>
            <p className="text-[14px] mt-0.5" style={{ color: 'var(--text-2)' }}>查看与编辑个人信息</p>
          </div>
          <span className="text-[20px]" style={{ color: 'var(--border)' }}>›</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="rounded-[16px] overflow-hidden divide-y" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {MENU_ITEMS.map(item => (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left active:opacity-70"
            >
              <img
                src={item.icon}
                alt=""
                style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }}
                draggable={false}
              />
              <span className="flex-1 font-medium" style={{ color: 'var(--text-1)' }}>{item.label}</span>
              <span className="text-[18px]" style={{ color: 'var(--border)' }}>›</span>
            </button>
          ))}
        </div>

        <button className="w-full mt-6 py-3 font-medium text-red-400 active:opacity-60">
          退出登录
        </button>
      </div>
    </div>
  )
}
