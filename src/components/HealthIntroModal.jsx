import { useSettings } from '../context/SettingsContext'

// One-shot intro modal — shown when user has never seen the health onboarding.
// Either button dismisses the modal forever.
export default function HealthIntroModal({ onStart, onDismiss }) {
  const { settings } = useSettings()
  const color = settings.stampColor || '#C98D48'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="rounded-[24px] px-6 py-7 max-w-[340px] w-full"
        style={{ background: 'var(--surface)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-[34px]"
            style={{ background: `${color}1F` }}
          >
            🎯
          </div>
        </div>

        <h3 className="text-center font-display font-bold text-[20px] mb-2" style={{ color: 'var(--text-1)' }}>
          设置你的健康目标
        </h3>
        <p className="text-center text-[14px] leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
          回答 6 个简单问题，自动算出适合你的每日热量与营养目标。整个过程约 1 分钟。
        </p>

        <button
          onClick={onStart}
          className="w-full py-3.5 rounded-[14px] font-semibold text-[15px] active:opacity-70 mb-2"
          style={{ background: color, color: '#fff' }}
        >
          开始（约 1 分钟）
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-[14px] font-medium text-[14px] active:opacity-60"
          style={{ color: 'var(--text-2)' }}
        >
          以后再说
        </button>
      </div>
    </div>
  )
}
