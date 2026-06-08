import { useState, useMemo } from 'react'
import { useSettings } from '../context/SettingsContext'
import { ACTIVITY_LEVELS, GOALS, computeTargets } from '../utils/healthCalc'

// 6-question health profile questionnaire. Live-computes targets at the bottom.
// On save: writes profile + computed targets to settings, sets goalsMode='auto'.
export default function HealthOnboardingPage({ navigate }) {
  const { settings, updateSettings } = useSettings()
  const color = settings.stampColor || '#C98D48'
  const existing = settings.healthProfile || {}

  const [gender,        setGender]        = useState(existing.gender || 'female')
  const [birthDate,     setBirthDate]     = useState(existing.birthDate || '1995-01-01')
  const [heightCm,      setHeightCm]      = useState(existing.heightCm || 165)
  const [weightKg,      setWeightKg]      = useState(existing.weightKg || 60)
  const [activityLevel, setActivityLevel] = useState(existing.activityLevel || 'sedentary')
  const [goal,          setGoal]          = useState(existing.goal || 'maintain')

  // Live preview
  const preview = useMemo(() => computeTargets({
    gender, birthDate, heightCm, weightKg, activityLevel, goal,
  }), [gender, birthDate, heightCm, weightKg, activityLevel, goal])

  function handleSave() {
    const profile = { gender, birthDate, heightCm: Number(heightCm), weightKg: Number(weightKg), activityLevel, goal }
    const { calorieTarget, macroTargets } = computeTargets(profile)
    updateSettings({
      healthProfile: profile,
      calorieTarget,
      macroTargets,
      goalsMode: 'auto',
      hasSeenHealthOnboarding: true,
    })
    navigate(-1)
  }

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Nav */}
      <div className="flex items-center px-5 pt-14 pb-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <button onClick={() => navigate(-1)} className="text-[#FF9500] font-medium text-[16px] active:opacity-60 mr-4">
          ‹ 返回
        </button>
        <h2 className="flex-1 text-center font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>
          健康目标
        </h2>
        <button onClick={handleSave} className="text-[#FF9500] font-semibold text-[16px] active:opacity-60">
          保存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-32">
        <p className="text-[13px] mb-5" style={{ color: 'var(--text-2)' }}>
          回答 6 个简单问题，自动算出适合你的每日热量与营养目标
        </p>

        {/* Q1 — Gender */}
        <Section title="1 · 性别">
          <ChoiceRow value={gender} onChange={setGender} options={[
            { key: 'female', label: '女'   },
            { key: 'male',   label: '男'   },
            { key: 'other',  label: '其他' },
          ]} color={color}/>
        </Section>

        {/* Q2 — Birthday */}
        <Section title="2 · 生日">
          <input
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            className="w-full rounded-[12px] px-4 py-3 outline-none border"
            style={{ background: 'var(--surface)', color: 'var(--text-1)', borderColor: 'var(--border)' }}
          />
        </Section>

        {/* Q3 — Height */}
        <Section title="3 · 身高">
          <NumberInputWithUnit value={heightCm} onChange={setHeightCm} unit="cm" min={120} max={220}/>
        </Section>

        {/* Q4 — Weight */}
        <Section title="4 · 当前体重">
          <NumberInputWithUnit value={weightKg} onChange={setWeightKg} unit="kg" min={30} max={200}/>
        </Section>

        {/* Q5 — Activity */}
        <Section title="5 · 日常活动量">
          <div className="flex flex-col gap-2">
            {ACTIVITY_LEVELS.map(a => (
              <button
                key={a.key}
                onClick={() => setActivityLevel(a.key)}
                className="flex flex-col items-start rounded-[14px] px-4 py-3 active:opacity-70 transition-all"
                style={{
                  background: 'var(--surface)',
                  border: `2px solid ${activityLevel === a.key ? color : 'transparent'}`,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span className="font-semibold text-[15px]" style={{ color: activityLevel === a.key ? color : 'var(--text-1)' }}>
                  {a.label}
                </span>
                <span className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>
                  {a.desc}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* Q6 — Goal */}
        <Section title="6 · 目标">
          <div className="flex flex-col gap-2">
            {GOALS.map(g => (
              <button
                key={g.key}
                onClick={() => setGoal(g.key)}
                className="flex items-center justify-between rounded-[14px] px-4 py-3 active:opacity-70 transition-all"
                style={{
                  background: 'var(--surface)',
                  border: `2px solid ${goal === g.key ? color : 'transparent'}`,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-[15px]" style={{ color: goal === g.key ? color : 'var(--text-1)' }}>
                    {g.label}
                  </span>
                  <span className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>
                    {g.desc}
                  </span>
                </div>
                {g.deltaKcal !== 0 && (
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
                    {g.deltaKcal > 0 ? '+' : ''}{g.deltaKcal} kcal
                  </span>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* Live preview */}
        <div className="mt-6 rounded-[18px] px-5 py-5" style={{ background: `${color}14`, border: `1.5px solid ${color}55` }}>
          <p className="text-[12px] font-semibold tracking-widest mb-2" style={{ color }}>
            根据你的回答 · 每日目标
          </p>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="font-display text-[40px] font-bold leading-none" style={{ color: 'var(--text-1)' }}>
              {preview.calorieTarget}
            </span>
            <span className="text-[14px]" style={{ color: 'var(--text-2)' }}>kcal</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MacroPreview label="碳水"   value={preview.macroTargets.carbs}   col="#F5A623"/>
            <MacroPreview label="蛋白质" value={preview.macroTargets.protein} col="#5B8A5F"/>
            <MacroPreview label="脂肪"   value={preview.macroTargets.fat}     col={color}/>
          </div>
          <p className="text-[11px] mt-3" style={{ color: 'var(--text-2)' }}>
            BMR {preview.bmr} · TDEE {preview.tdee} · 年龄 {preview.age}
          </p>
        </div>

        {/* Save button (in addition to top-right save) */}
        <button
          onClick={handleSave}
          className="w-full mt-5 py-3.5 rounded-[14px] font-semibold text-[15px] active:opacity-70"
          style={{ background: color, color: '#fff' }}
        >
          采纳这些目标
        </button>

        <p className="text-[11px] text-center mt-4" style={{ color: 'var(--text-3)' }}>
          算法仅供参考。如有特殊健康情况请咨询专业医师/营养师。
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--text-2)' }}>{title}</p>
      {children}
    </div>
  )
}

function ChoiceRow({ value, onChange, options, color }) {
  return (
    <div className="flex gap-2">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className="flex-1 py-3 rounded-[12px] font-medium text-[14px] active:opacity-70 transition-all"
          style={{
            background: value === o.key ? color : 'var(--surface)',
            color: value === o.key ? '#fff' : 'var(--text-1)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function NumberInputWithUnit({ value, onChange, unit, min, max }) {
  return (
    <div className="flex items-center rounded-[12px] px-4 py-3 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => {
          const v = e.target.value
          onChange(v === '' ? '' : Number(v))
        }}
        onBlur={e => {
          const v = e.target.value
          if (v === '') return
          onChange(Math.max(min, Math.min(max, Number(v))))
        }}
        className="flex-1 bg-transparent outline-none text-[16px] font-medium"
        style={{ color: 'var(--text-1)' }}
      />
      <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>{unit}</span>
    </div>
  )
}

function MacroPreview({ label, value, col }) {
  return (
    <div className="rounded-[10px] py-2 text-center" style={{ background: 'var(--surface)' }}>
      <p className="font-semibold text-[15px]" style={{ color: col }}>{value}g</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>{label}</p>
    </div>
  )
}
