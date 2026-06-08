import { useState } from 'react'

export default function GeneralSettingsPage({ navigate }) {
  const [settings, setSettings] = useState({ haptics: true, icloud: false })
  const toggle = key => setSettings(p => ({ ...p, [key]: !p[key] }))

  // iCloud 同步是一个占位项：网页版无法真的连 iCloud（需要 native iOS app 的 CloudKit），
  // 这里展示成"未开启 = 仅本设备 / 开启 = iCloud 同步"的预览，开关 disabled，
  // 旁边挂个"iOS 即将支持"小标签。等做 iOS 版时把 disabled 拿掉、真正接上 CloudKit。
  const rows = [
    { key: 'haptics', label: '触感反馈',  desc: '操作时震动提示' },
    {
      key: 'icloud',
      label: 'iCloud 同步',
      descOff: '未开启 · 数据仅保留在此设备',
      descOn:  '已开启 · 由 iCloud 在所有设备间同步',
      disabled: true,
      badge: 'iOS 即将支持',
    },
  ]

  return (
    <div className="app-page-bg flex flex-col h-full">
      <div className="flex items-center px-5 pt-14 pb-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <button onClick={() => navigate(-1)} className="text-[#FF9500] font-medium text-[16px] active:opacity-60 mr-3">‹ 返回</button>
        <h2 className="font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>通用设置</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="rounded-[16px] overflow-hidden divide-y" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {rows.map(row => {
            const on   = settings[row.key]
            const desc = row.descOff || row.descOn || row.desc
                       ? (on ? (row.descOn || row.desc) : (row.descOff || row.desc))
                       : ''
            return (
              <div key={row.key} className="flex items-center px-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium" style={{ color: 'var(--text-1)' }}>{row.label}</p>
                    {row.badge && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--bg)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                      >
                        {row.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>{desc}</p>
                </div>
                <button
                  onClick={() => { if (row.disabled) return; toggle(row.key); row.action?.() }}
                  disabled={row.disabled}
                  className={`w-[51px] h-[31px] rounded-full transition-colors flex-shrink-0 relative ${on ? 'bg-[#FF9500]' : 'bg-[#E5E5EA]'}`}
                  style={row.disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
                  <div
                    className="absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md transition-transform"
                    style={{ transform: on ? 'translateX(22px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>
            )
          })}
        </div>

        <div className="rounded-[16px] overflow-hidden mt-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <button
            onClick={() => navigate('about')}
            className="w-full flex items-center px-4 py-4 text-left active:opacity-70"
          >
            <span className="flex-1" style={{ color: 'var(--text-1)' }}>关于 Stickerful</span>
            <span style={{ color: 'var(--border)' }}>›</span>
          </button>
        </div>
      </div>
    </div>
  )
}
