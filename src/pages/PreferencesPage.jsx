import { useSettings } from '../context/SettingsContext'

export default function PreferencesPage({ navigate }) {
  const { settings, updateSetting, updateSettings } = useSettings()
  const color = settings.stampColor || '#C98D48'

  function updateCalorie(v) {
    const n = Math.max(800, Math.min(5000, Number(v) || 0))
    updateSettings({ calorieTarget: n, goalsMode: 'manual' })
  }
  function updateMacro(key, v) {
    const n = Math.max(0, Math.min(800, Number(v) || 0))
    updateSettings({ macroTargets: { ...settings.macroTargets, [key]: n }, goalsMode: 'manual' })
  }

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Nav */}
      <div className="flex items-center px-5 pt-14 pb-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <button onClick={() => navigate(-1)} className="text-[#FF9500] font-medium text-[16px] active:opacity-60 mr-3">
          ‹ 返回
        </button>
        <h2 className="font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>偏好设置</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-8">
        {/* Main toggles */}
        <div className="rounded-[16px] overflow-hidden divide-y" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {/* Show rating */}
          <div className="flex items-center px-4 py-4">
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text-1)' }}>显示评分</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>印章详情与足迹页的星级评分</p>
            </div>
            <Toggle on={settings.showRating} onChange={v => updateSetting('showRating', v)} />
          </div>

          {/* Auto date */}
          <div className="flex items-center px-4 py-4">
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text-1)' }}>自动填入今日日期</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>添加记录时自动填入当天</p>
            </div>
            <Toggle on={settings.autoDate} onChange={v => updateSetting('autoDate', v)} />
          </div>
        </div>

        {/* Health goals */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-2)' }}>健康目标</p>
          {settings.goalsMode !== 'default' && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: settings.goalsMode === 'auto' ? `${color}1F` : 'var(--bg)',
                color:      settings.goalsMode === 'auto' ? color : 'var(--text-2)',
              }}
            >
              {settings.goalsMode === 'auto' ? '问卷自动' : '手动调整'}
            </span>
          )}
        </div>

        <div className="rounded-[16px] overflow-hidden divide-y" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <GoalRow label="每日热量目标" value={settings.calorieTarget} unit="kcal" onChange={updateCalorie} />
          <GoalRow label="碳水"           value={settings.macroTargets?.carbs   ?? 0} unit="g" onChange={v => updateMacro('carbs',   v)} />
          <GoalRow label="蛋白质"         value={settings.macroTargets?.protein ?? 0} unit="g" onChange={v => updateMacro('protein', v)} />
          <GoalRow label="脂肪"           value={settings.macroTargets?.fat     ?? 0} unit="g" onChange={v => updateMacro('fat',     v)} />
        </div>

        <button
          onClick={() => navigate('health-onboarding')}
          className="w-full mt-3 py-3 rounded-[14px] font-medium text-[14px] active:opacity-70"
          style={{ background: `${color}18`, color }}
        >
          {settings.healthProfile ? '重新填写健康问卷' : '填写健康问卷自动计算'}
        </button>

        <p className="text-[11px] mt-3 px-1" style={{ color: 'var(--text-3)' }}>
          手动调整任一数值后，进入"手动调整"模式；再次填写问卷会重新计算并覆盖所有目标。
        </p>
      </div>
    </div>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-[51px] h-[31px] rounded-full transition-colors flex-shrink-0 relative ${on ? 'bg-[#FF9500]' : 'bg-[#E5E5EA]'}`}
    >
      <div
        className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md transition-transform`}
        style={{ transform: on ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

function GoalRow({ label, value, unit, onChange }) {
  return (
    <div className="flex items-center px-4 py-3">
      <p className="flex-1 font-medium" style={{ color: 'var(--text-1)' }}>{label}</p>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-20 text-right bg-transparent outline-none font-semibold text-[15px]"
        style={{ color: 'var(--text-1)' }}
      />
      <span className="ml-1 text-[13px]" style={{ color: 'var(--text-2)' }}>{unit}</span>
    </div>
  )
}
