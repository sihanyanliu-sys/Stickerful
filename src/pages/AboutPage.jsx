import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import pkg from '../../package.json'

// Logo lives in /public/assets/logo.png — fallback to text monogram if missing.
const LOGO_PATH = '/assets/logo.png'

export default function AboutPage({ navigate, records = [] }) {
  const { settings } = useSettings()
  const color = settings.stampColor || '#C98D48'
  const [logoOk, setLogoOk] = useState(true)

  const totalStamps = records.length
  const totalCities = new Set(records.map(r => r.city).filter(Boolean)).size
  const totalShops  = new Set(records.map(r => r.shopName).filter(Boolean)).size

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Nav */}
      <div
        className="flex items-center px-5 pt-14 pb-4 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <button onClick={() => navigate(-1)} className="text-[#FF9500] font-medium text-[16px] active:opacity-60 mr-3">
          ‹ 返回
        </button>
        <h2 className="font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>
          关于 Stickerful
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-12">
        {/* Logo + name + version */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-32 h-32 rounded-[30px] overflow-hidden mb-4 flex items-center justify-center"
            style={{ background: 'var(--surface)', boxShadow: '0 6px 20px rgba(44,24,16,0.10)' }}
          >
            {logoOk ? (
              <img
                src={LOGO_PATH}
                alt="Stickerful logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.14)' }}
                onError={() => setLogoOk(false)}
                draggable={false}
              />
            ) : (
              <span className="font-display font-bold text-[42px]" style={{ color }}>S</span>
            )}
          </div>
          <h1 className="font-brand font-semibold text-[30px]" style={{ color: 'var(--brand-text)' }}>
            Stickerful
          </h1>
          <p className="text-[13px] mt-1" style={{ color }}>
            ✦ bites &amp; brews ✦
          </p>
          <p className="text-[12px] mt-2" style={{ color: 'var(--text-2)' }}>
            v{pkg.version}
          </p>
        </div>

        {/* Intro */}
        <Section title="简介">
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-1)' }}>
            Stickerful 是一款轻量的咖啡与美食打卡日记。把每一次外出探店、每一杯精心冲煮的咖啡、每一份难忘的食物，
            用一枚可爱的印章贴纸记录下来，慢慢拼成一幅属于你的足迹地图。
          </p>
        </Section>

        {/* Stats */}
        <Section title="我的足迹">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="印章" value={totalStamps} col={color} />
            <StatTile label="城市" value={totalCities} col={color} />
            <StatTile label="店铺" value={totalShops}  col={color} />
          </div>
          <p className="text-[12px] mt-3 text-center" style={{ color: 'var(--text-2)' }}>
            加入时间 · {settings.joinDate || '—'}
          </p>
        </Section>

        {/* Credits */}
        <Section title="致谢">
          <p
            className="text-[13.5px] leading-[1.9] italic"
            style={{ color: 'var(--text-1)', fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            一杯咖啡的余温，<br/>
            一块面包的清晨——<br/>
            都值得被认真留下来。
            <br/><br/>
            愿这枚小小的印章，<br/>
            盛得下你旅途里<br/>
            每一份柔软的时刻。
          </p>
          <div
            className="mt-5 pt-4 text-right"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <p
              className="font-display text-[15px] italic"
              style={{ color: color }}
            >
              — Designed by Ada Liu
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-2)' }}>
              2026 · Los Angeles, United States
            </p>
          </div>
        </Section>

        <p className="text-[11px] text-center mt-6" style={{ color: 'var(--text-3)' }}>
          © 2026 Stickerful · All rights reserved.
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--text-2)' }}>{title}</p>
      <div
        className="rounded-[16px] px-4 py-4"
        style={{ background: 'var(--surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        {children}
      </div>
    </div>
  )
}

function StatTile({ label, value, col }) {
  return (
    <div className="flex flex-col items-center py-2 rounded-[12px]" style={{ background: 'var(--bg)' }}>
      <p className="font-display text-[24px] font-bold" style={{ color: col }}>{value}</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>{label}</p>
    </div>
  )
}
