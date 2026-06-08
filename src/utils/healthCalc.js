// ─────────────────────────────────────────────────────────────────────────────
// Daily calorie & macro target calculation
// Formula: Mifflin-St Jeor (BMR) → TDEE (activity) → goal adjustment → macros
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: '久坐少动',  desc: '办公室/学生，几乎不运动',      factor: 1.2   },
  { key: 'light',     label: '轻度活动',  desc: '每周运动 1-3 次',              factor: 1.375 },
  { key: 'moderate',  label: '中度活动',  desc: '每周运动 3-5 次',              factor: 1.55  },
  { key: 'high',      label: '高强度活动',desc: '每天运动 / 体力劳动',          factor: 1.725 },
]

export const GOALS = [
  { key: 'lose',     label: '减脂',       desc: '降低体脂',     deltaKcal: -400 },
  { key: 'maintain', label: '维持当前',   desc: '保持现状',     deltaKcal:    0 },
  { key: 'gain',     label: '增肌',       desc: '增加肌肉量',   deltaKcal:  300 },
]

const MACRO_RATIO = {
  lose:     { protein: 0.30, carbs: 0.40, fat: 0.30 },
  maintain: { protein: 0.25, carbs: 0.50, fat: 0.25 },
  gain:     { protein: 0.25, carbs: 0.55, fat: 0.20 },
}

// Default fallback values (used when no health profile exists yet)
export const DEFAULT_CALORIE_TARGET = 2000
export const DEFAULT_MACRO_TARGETS  = { carbs: 250, protein: 60, fat: 65 }

// Calculate age from a YYYY-MM-DD birth date string
export function calcAge(birthDate, today = new Date()) {
  if (!birthDate) return 30
  const b = new Date(birthDate + 'T00:00:00')
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

// Mifflin-St Jeor BMR (kcal/day)
export function calcBMR({ gender, heightCm, weightKg, age }) {
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age
  bmr += gender === 'female' ? -161 : 5    // 'other' uses male formula (no widely-accepted alternative)
  return bmr
}

// Compute calorie + macro targets from a profile
// profile: { gender, birthDate, heightCm, weightKg, activityLevel, goal }
export function computeTargets(profile) {
  const age = calcAge(profile.birthDate)
  const bmr = calcBMR({
    gender:    profile.gender,
    heightCm:  Number(profile.heightCm),
    weightKg:  Number(profile.weightKg),
    age,
  })
  const activity = ACTIVITY_LEVELS.find(a => a.key === profile.activityLevel) || ACTIVITY_LEVELS[0]
  const goal     = GOALS.find(g => g.key === profile.goal) || GOALS[1]
  const tdee     = bmr * activity.factor
  const calorieTarget = Math.max(1200, Math.round(tdee + goal.deltaKcal))   // 1200 floor for safety

  const ratio = MACRO_RATIO[profile.goal] || MACRO_RATIO.maintain
  const macroTargets = {
    carbs:   Math.round((calorieTarget * ratio.carbs)   / 4),
    protein: Math.round((calorieTarget * ratio.protein) / 4),
    fat:     Math.round((calorieTarget * ratio.fat)     / 9),
  }

  return { calorieTarget, macroTargets, bmr: Math.round(bmr), tdee: Math.round(tdee), age }
}
