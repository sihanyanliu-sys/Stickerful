import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_CALORIE_TARGET, DEFAULT_MACRO_TARGETS } from '../utils/healthCalc'
import { todayStr } from '../utils/date'

const SettingsContext = createContext(null)
const STORAGE_KEY = 'stickerful_settings'

export const DEFAULT_SETTINGS = {
  showRating:   true,
  autoDate:     true,
  stampPreset:  'round-light',    // the full style preset id
  stampShape:   'round',          // round | decagon | wave | circle
  stampTheme:   'light',          // light | brown  (for StampArt rendering)
  stampColor:   '#C98D48',
  texture:      'none',           // none | paper | linen | noise
  theme:        'light',          // light | dark | auto
  userName:     'Hana',
  userAvatar:   '🙂',
  joinDate:     null,             // first-launch local date; auto-filled on first load

  // Health goals — populated by onboarding questionnaire, editable in preferences
  hasSeenHealthOnboarding: false,
  healthProfile:    null,            // { gender, birthDate, heightCm, weightKg, activityLevel, goal }
  calorieTarget:    DEFAULT_CALORIE_TARGET,
  macroTargets:     DEFAULT_MACRO_TARGETS,
  goalsMode:        'default',       // 'default' | 'auto' (from questionnaire) | 'manual' (user overrode)
}

function loadSettings() {
  let s
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    s = saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS }
  } catch {
    s = { ...DEFAULT_SETTINGS }
  }
  // Stamp the join date on first launch (or migrate old installs that pre-date this field)
  if (!s.joinDate) s.joinDate = todayStr()
  return s
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  // Persist on every change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch {}
  }, [settings])

  function updateSetting(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function updateSettings(patch) {
    setSettings(prev => ({ ...prev, ...patch }))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}
