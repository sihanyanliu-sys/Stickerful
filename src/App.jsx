import { useState, useEffect } from 'react'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import BottomNav from './components/BottomNav'
import {
  deleteRemoteRecord,
  fetchRemoteRecords,
  loadLocalRecords,
  migrateLocalRecordsOnce,
  saveLocalRecords,
  saveRemoteRecord,
} from './services/recordStore'

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
import AuthPage from './pages/AuthPage'

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
  const { user, loading } = useAuth()
  const [stack, setStack] = useState([{ page: 'home', params: {} }])
  const [showHealthIntro, setShowHealthIntro] = useState(!settings.hasSeenHealthOnboarding)
  const [records, setRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsError, setRecordsError] = useState('')

  useEffect(() => {
    if (!user) {
      let cancelled = false
      queueMicrotask(() => {
        if (cancelled) return
        setRecords([])
        setRecordsLoading(false)
        setRecordsError('')
      })
      return () => { cancelled = true }
    }

    let cancelled = false
    ;(async () => {
      const cached = loadLocalRecords(user.id)
      if (cached.length > 0) setRecords(cached)
      setRecordsLoading(true)
      setRecordsError('')
      try {
        const remoteRecords = await fetchRemoteRecords(user.id)
        const nextRecords = await migrateLocalRecordsOnce(user.id, remoteRecords)
        if (cancelled) return
        setRecords(nextRecords)
        saveLocalRecords(user.id, nextRecords)
      } catch (error) {
        if (import.meta.env.DEV) console.warn('Failed to load cloud records:', error)
        if (!cancelled) setRecordsError('云端记录加载失败，当前显示本地缓存。')
      } finally {
        if (!cancelled) setRecordsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  const current = stack[stack.length - 1]

  function cacheRecords(next) {
    setRecords(next)
    saveLocalRecords(user?.id, next)
  }

  async function addRecord(record) {
    if (!user) return false
    const draft = { ...record, id: String(record.id) }
    const previous = records
    cacheRecords([draft, ...previous])
    try {
      const saved = await saveRemoteRecord(user.id, draft)
      cacheRecords([saved, ...previous])
      return true
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to save record:', error)
      cacheRecords(previous)
      return false
    }
  }

  async function updateRecord(record) {
    if (!user) return false
    const draft = { ...record, id: String(record.id) }
    const previous = records
    cacheRecords(previous.map(r => String(r.id) === String(draft.id) ? draft : r))
    try {
      const saved = await saveRemoteRecord(user.id, draft)
      cacheRecords(previous.map(r => String(r.id) === String(saved.id) ? saved : r))
      return true
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to update record:', error)
      cacheRecords(previous)
      return false
    }
  }

  async function deleteRecord(id) {
    if (!user) return false
    const previous = records
    cacheRecords(previous.filter(r => String(r.id) !== String(id)))
    try {
      await deleteRemoteRecord(user.id, id)
      return true
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to delete record:', error)
      cacheRecords(previous)
      return false
    }
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

  if (loading || (recordsLoading && records.length === 0)) {
    return (
      <div className={`app-container ${themeClass} ${textureClass} flex h-svh max-w-sm mx-auto items-center justify-center overflow-hidden shadow-2xl`}>
        <div className="flex flex-col items-center gap-4">
          <img src="/assets/logo.png" alt="Stickerful" className="h-20 w-20 rounded-[24px] shadow-lg" />
          <p className="text-[14px]" style={{ color: 'var(--text-2)' }}>
            {loading ? '正在确认登录状态...' : '正在同步云端记录...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <div
      className={`app-container ${themeClass} ${textureClass} flex flex-col h-svh max-w-sm mx-auto overflow-hidden shadow-2xl`}
      style={{ backgroundColor: 'var(--texture-bg)' }}
    >
      <div className="flex-1 overflow-hidden">
        {recordsError && (
          <div
            className="absolute left-4 right-4 top-4 z-[999] rounded-[16px] px-4 py-3 text-center text-[13px] shadow-lg"
            style={{ background: 'rgba(255,252,248,0.94)', color: '#B45309' }}
          >
            {recordsError}
          </div>
        )}
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
    <AuthProvider>
      <SettingsProvider>
        <AppInner />
      </SettingsProvider>
    </AuthProvider>
  )
}
