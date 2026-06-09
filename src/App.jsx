import { useState, useEffect } from 'react'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import BottomNav from './components/BottomNav'
import { cropToBBox } from './utils/cropCutout'

import HomePage from './pages/HomePage'
import AddRecordPage from './pages/AddRecordPage'
import ShopSearchPage from './pages/ShopSearchPage'
import FootprintPage from './pages/FootprintPage'
import StampDetailPage from './pages/StampDetailPage'
import DayListPage from './pages/DayListPage'
import MapPage from './pages/MapPage'
import CityListPage from './pages/CityListPage'
import ShopListPage from './pages/ShopListPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import PreferencesPage from './pages/PreferencesPage'
import StampSettingsPage from './pages/StampSettingsPage'
import TextureSettingsPage from './pages/TextureSettingsPage'
import GeneralSettingsPage from './pages/GeneralSettingsPage'
import ThemeSettingsPage from './pages/ThemeSettingsPage'
import HealthOnboardingPage from './pages/HealthOnboardingPage'
import HealthIntroModal from './components/HealthIntroModal'
import AboutPage from './pages/AboutPage'

const TAB_PAGES = ['home', 'footprint', 'map', 'settings']

const PAGE_MAP = {
  home: HomePage,
  'add-record': AddRecordPage,
  'shop-search': ShopSearchPage,
  footprint: FootprintPage,
  'stamp-detail': StampDetailPage,
  'day-list': DayListPage,
  map: MapPage,
  'city-list': CityListPage,
  'shop-list': ShopListPage,
  settings: SettingsPage,
  profile: ProfilePage,
  preferences: PreferencesPage,
  'stamp-settings': StampSettingsPage,
  'texture-settings': TextureSettingsPage,
  'general-settings': GeneralSettingsPage,
  'theme-settings': ThemeSettingsPage,
  'health-onboarding': HealthOnboardingPage,
  about: AboutPage,
}

function AppInner() {
  const { settings, updateSetting } = useSettings()
  const [stack, setStack] = useState([{ page: 'home', params: {} }])
  const [showHealthIntro, setShowHealthIntro] = useState(!settings.hasSeenHealthOnboarding)
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem('stickerful_records')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // One-time migration: crop existing cutouts to non-transparent bbox so
  // they render at consistent visual size in StickerStack.
  useEffect(() => {
    if (localStorage.getItem('stickerful_cutout_crop_v2') === 'done') return
    let cancelled = false
    ;(async () => {
      const next = []
      let changed = false
      for (const r of records) {
        if (r.cutout) {
          try {
            const cropped = await cropToBBox(r.cutout)
            if (cropped !== r.cutout) changed = true
            next.push({ ...r, cutout: cropped })
          } catch {
            next.push(r)
          }
        } else {
          next.push(r)
        }
      }
      if (cancelled) return
      if (changed) saveRecords(next)
      localStorage.setItem('stickerful_cutout_crop_v2', 'done')
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = stack[stack.length - 1]

  function saveRecords(next) {
    try {
      localStorage.setItem('stickerful_records', JSON.stringify(next))
      setRecords(next)
      return true
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to save records locally:', error)
      return false
    }
  }

  function addRecord(record) {
    return saveRecords([record, ...records])
  }

  function updateRecord(record) {
    return saveRecords(records.map(r => r.id === record.id ? record : r))
  }

  function deleteRecord(id) {
    return saveRecords(records.filter(r => r.id !== id))
  }

  function navigate(target, params = {}) {
    if (target === -1) {
      setStack(s => {
        if (s.length <= 1) return s
        const popped = s.slice(0, -1)
        if (Object.keys(params).length > 0) {
          const top = popped[popped.length - 1]
          popped[popped.length - 1] = { ...top, params: { ...top.params, ...params } }
        }
        return popped
      })
      return
    }
    if (TAB_PAGES.includes(target)) { setStack([{ page: target, params }]); return }
    setStack(s => [...s, { page: target, params }])
  }

  const PageComponent = PAGE_MAP[current.page] || HomePage
  const showNav = TAB_PAGES.includes(current.page)

  // Determine if dark (auto uses system preference)
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = settings.theme === 'dark' || (settings.theme === 'auto' && prefersDark)
  const themeClass = isDark ? 'theme-dark' : ''
  // Textures are only applied in light theme. In dark mode they (a) look essentially
  // invisible anyway and (b) used to fight with text color variables and hide the title.
  // We don't mutate settings.texture — when user switches back to light, their saved
  // preference (e.g. 'linen') re-applies automatically.
  const textureClass = (!isDark && settings.texture !== 'none') ? `texture-${settings.texture}` : ''

  return (
    <div
      className={`app-container ${themeClass} ${textureClass} flex flex-col h-svh max-w-sm mx-auto overflow-hidden shadow-2xl`}
      style={{ backgroundColor: 'var(--texture-bg)' }}
    >
      <div className="flex-1 overflow-hidden">
        <PageComponent
          navigate={navigate}
          params={current.params}
          records={records}
          addRecord={addRecord}
          updateRecord={updateRecord}
          deleteRecord={deleteRecord}
        />
      </div>
      {showNav && <BottomNav currentPage={current.page} navigate={navigate} isDark={isDark} />}
      {showHealthIntro && (
        <HealthIntroModal
          onStart={() => {
            setShowHealthIntro(false)
            updateSetting('hasSeenHealthOnboarding', true)
            navigate('health-onboarding')
          }}
          onDismiss={() => {
            setShowHealthIntro(false)
            updateSetting('hasSeenHealthOnboarding', true)
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <AppInner />
    </SettingsProvider>
  )
}
