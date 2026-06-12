import { useState, useRef, useEffect } from 'react'
import { useSettings } from '../context/SettingsContext'
import { stickerList, stickerMap } from '../stickerData'
import { compressImageDataUrl, compressTransparentImageDataUrl } from '../utils/compressImage'
import { recognizeFoodImage } from '../services/aiProvider'
import { createCutoutDetailed } from '../services/cutoutProvider'

const STICKER_CATEGORIES = [
  { label: '全部', ids: stickerList.map(s => s.id) },
  { label: '咖啡', ids: ['coffee-cup', 'latte-art', 'matcha-latte', 'teapot', 'fruit-tea'] },
  { label: '奶茶', ids: ['brown-sugar-boba', 'milk-tea-boba', 'fruit-tea', 'tropical-cocktail'] },
  { label: '甜点', ids: ['croissant', 'toast-loaf', 'buttered-toast', 'cupcake', 'pink-donut', 'cookie', 'birthday-cake', 'strawberry-cake-slice'] },
  { label: '中餐', ids: ['rice-bowl', 'ramen', 'sushi-bento', 'bao', 'miso-soup', 'bibimbap', 'curry-rice', 'beef-noodle-soup', 'rice-noodle-soup', 'dumplings', 'yin-yang-hot-pot', 'large-bao-steamer', 'roast-duck', 'congee', 'scallion-pancake', 'mapo-tofu', 'spring-rolls', 'mooncake', 'egg-tart', 'sweet-sour-meatballs', 'kung-pao-chicken', 'stir-fry', 'hot-pot', 'shumai'] },
  { label: '西餐', ids: ['salad-bowl', 'spaghetti', 'pizza-slice', 'burger', 'steak', 'taco', 'cream-soup', 'yakitori', 'fried-chicken'] },
  { label: '酒水', ids: ['martini', 'red-wine', 'champagne', 'beer-mug'] },
]

const USER_LOC_KEY = 'stickerful_user_loc'

const CUTOUT_PROVIDER_LABELS = {
  baidu: '百度智能抠图',
  web: '本地模型',
  'apple-vision': 'Apple Vision',
}

function getCachedLocation() {
  try {
    const loc = JSON.parse(localStorage.getItem(USER_LOC_KEY) || 'null')
    if (loc && isUsableCoord(loc.lat, loc.lng)) {
      return loc
    }
  } catch {
    // Records can still be saved without cached location.
  }
  return null
}

function hasCoordValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function isUsableCoord(lat, lng) {
  if (!hasCoordValue(lat) || !hasCoordValue(lng)) return false
  const latNum = Number(lat)
  const lngNum = Number(lng)
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false
  return !(latNum === 0 && lngNum === 0)
}

// Local-timezone today — toISOString() shifts to UTC and breaks date in early-morning hours
function todayStr() {
  const d = new Date()
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function fileToDataUrl(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
}


export default function AddRecordPage({ navigate, params = {}, addRecord, updateRecord }) {
  const { settings } = useSettings()
  const color   = settings.stampColor || '#C98D48'
  const fileRef = useRef(null)
  const base64Ref = useRef(null) // cache so re-recognition doesn't re-fetch
  const aiImageRef = useRef(null) // compressed image for faster model calls

  const prefillShop  = params.shop    || null
  const restore      = params._restore || {}
  const prefillDate  = restore.date || params.defaultDate || (settings.autoDate ? todayStr() : '')

  const rawEmoji = restore.emoji ?? params.stamp?.emoji
  const [emoji,    setEmoji]    = useState(stickerMap.has(rawEmoji) ? rawEmoji : 'coffee-cup')
  const [cat,      setCat]      = useState('全部')
  const [rating,   setRating]   = useState(restore.rating   ?? params.stamp?.rating   ?? 0)
  const [note,     setNote]     = useState(restore.note     ?? params.stamp?.note     ?? '')
  const [shopName] = useState(prefillShop?.name  || restore.shopName || params.stamp?.shopName || '')
  const [city]     = useState(prefillShop?.city  || restore.city     || params.stamp?.city     || '')
  const shopLat    = prefillShop?.lat     || params.stamp?.lat     || null
  const shopLng    = prefillShop?.lng     || params.stamp?.lng     || null
  const shopProvider = prefillShop?.provider || params.stamp?.provider || null
  const shopPoiId = prefillShop?.poiId || params.stamp?.poiId || params.stamp?.placeId || null
  const shopPlaceId = prefillShop?.placeId || params.stamp?.placeId || null
  const shopAdcode = prefillShop?.adcode || params.stamp?.adcode || ''
  const shopCoordType = prefillShop?.coordType || params.stamp?.coordType || null
  const [date,     setDate]     = useState(prefillDate)
  const [photo,    setPhoto]    = useState(restore.photo    ?? params.stamp?.photo    ?? null)
  const [cutout,   setCutout]   = useState(restore.cutout   ?? params.stamp?.cutout   ?? null)
  const [cutoutProvider, setCutoutProvider] = useState(restore.cutoutProvider ?? params.stamp?.cutoutProvider ?? null)
  const [cutoutLoading, setCutoutLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Pre-populate AI result: from shop-search restore, or from editing a record with calorie data
  const initAiResult = (() => {
    if (restore.aiResult) return restore.aiResult
    const s = params.stamp
    if (s?.calories > 0) return { name: s.dishName || '', description: '', calories: s.calories, carbs: s.carbs, protein: s.protein, fat: s.fat }
    return null
  })()
  const [aiResult,  setAiResult]  = useState(initAiResult)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError,   setAiError]   = useState(null)

  useEffect(() => {
    if (photo && photo.startsWith('data:') && !base64Ref.current) {
      base64Ref.current = photo
      aiImageRef.current = null
    }
  }, [photo])

  async function runRecognition(noteHint) {
    if (!base64Ref.current) return
    setAiLoading(true)
    setAiError(null)
    try {
      if (!aiImageRef.current) {
        aiImageRef.current = await compressImageDataUrl(base64Ref.current)
      }
      const result = await recognizeFoodImage(aiImageRef.current, noteHint)
      setAiResult(result)
    } catch {
      setAiError('识别失败，请重试')
    } finally {
      setAiLoading(false)
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    base64Ref.current = null
    aiImageRef.current = null
    setAiResult(null)
    setAiError(null)
    setCutout(null)
    setCutoutProvider(null)
    e.target.value = ''

    // Show instantly with blob URL, then swap to persistent data URL
    const blobUrl = URL.createObjectURL(file)
    setPhoto(blobUrl)
    setAiLoading(true)
    setCutoutLoading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      base64Ref.current = dataUrl          // store full data URL
      const persistentPhotoDataUrl = await compressImageDataUrl(dataUrl, { maxSide: 1280, quality: 0.78 })
      setPhoto(persistentPhotoDataUrl)     // store a smaller image so browser storage does not overflow
      URL.revokeObjectURL(blobUrl)
      const aiDataUrl = await compressImageDataUrl(dataUrl)
      aiImageRef.current = aiDataUrl

      // AI recognition and background removal run in parallel
      const [result] = await Promise.allSettled([
        recognizeFoodImage(aiDataUrl, note).then(r => { setAiResult(r); return r }),
        createCutoutDetailed(dataUrl)
          .then(async c => {
            const persistentCutout = await compressTransparentImageDataUrl(c.image, { maxSide: 960, quality: 0.82 })
            setCutout(persistentCutout)
            setCutoutProvider(c.provider)
            setCutoutLoading(false)
          })
          .catch(() => setCutoutLoading(false)),
      ])
      if (result.status === 'rejected') setAiError('识别失败，请重试')
    } catch {
      setAiError('识别失败，请重试')
      setCutoutLoading(false)
    } finally {
      setAiLoading(false)
    }
  }

  const isEditing = !!params.stamp?.id

  async function handleSave() {
    if (!shopName || saving) return
    setSaving(true)
    const cachedLocation = getCachedLocation()
    const fallbackLat = cachedLocation ? Number(cachedLocation.lat) : null
    const fallbackLng = cachedLocation ? Number(cachedLocation.lng) : null
    const finalLat = isUsableCoord(shopLat, shopLng) ? Number(shopLat) : fallbackLat
    const finalLng = isUsableCoord(shopLat, shopLng) ? Number(shopLng) : fallbackLng
    const finalProvider = shopProvider || cachedLocation?.provider || null
    const finalCoordType = shopCoordType || cachedLocation?.coordType || null
    const record = {
      id: isEditing ? params.stamp.id : Date.now().toString(),
      shopId:   prefillShop?.id || shopPoiId || params.stamp?.shopId || 'custom',
      shopName,
      city:     city || '未知城市',
      date,
      rating,
      note,
      emoji,
      photo:    photo || null,
      cutout:   cutout || null,
      cutoutProvider: cutoutProvider || null,
      provider: finalProvider,
      poiId:    shopPoiId,
      lat:      finalLat,
      lng:      finalLng,
      placeId:  shopPlaceId,
      adcode:   shopAdcode,
      coordType: finalCoordType,
      // nutrition from AI
      dishName: aiResult?.name    || params.stamp?.dishName  || null,
      calories: aiResult?.calories || params.stamp?.calories || 0,
      carbs:    aiResult?.carbs    || params.stamp?.carbs    || 0,
      protein:  aiResult?.protein  || params.stamp?.protein  || 0,
      fat:      aiResult?.fat      || params.stamp?.fat      || 0,
    }
    const saved = isEditing ? await updateRecord?.(record) : await addRecord?.(record)
    setSaving(false)
    if (saved === false) {
      alert('保存失败：云端记录没有写入成功。请检查网络，或稍后再试。')
      return
    }
    navigate(-1)
  }

  const catStickers = (STICKER_CATEGORIES.find(c => c.label === cat)?.ids || STICKER_CATEGORIES[0].ids)
    .map(id => stickerMap.get(id)).filter(Boolean)

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Nav */}
      <div className="flex items-center px-5 pt-14 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => navigate(-1)} className="font-medium text-[16px] active:opacity-60" style={{ color }}>取消</button>
        <h2 className="flex-1 text-center font-semibold text-[17px]" style={{ color: 'var(--text-1)' }}>{isEditing ? '编辑记录' : '添加记录'}</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="font-semibold text-[16px] active:opacity-60 disabled:opacity-50"
          style={{ color: shopName ? color : 'var(--text-2)' }}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">

        {/* ── Sticker picker ── */}
        <div>
          <p className="text-[13px] font-semibold mb-3 tracking-wide" style={{ color: 'var(--text-2)' }}>选择印章</p>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
            {STICKER_CATEGORIES.map(c => (
              <button
                key={c.label}
                onClick={() => setCat(c.label)}
                className="flex-none px-3 py-1 rounded-full text-[13px] font-medium transition-all active:opacity-60"
                style={cat === c.label ? { background: color, color: '#fff' } : { background: 'var(--bg)', color: 'var(--text-2)' }}
              >{c.label}</button>
            ))}
          </div>
          <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: 228 }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {catStickers.map(s => (
                <button
                  key={s.id}
                  onClick={() => setEmoji(s.id)}
                  className="aspect-square rounded-[14px] overflow-hidden active:scale-90 transition-transform p-0.5"
                  style={{
                    background: emoji === s.id ? `${color}20` : 'var(--bg)',
                    outline: emoji === s.id ? `2.5px solid ${color}` : '2.5px solid transparent',
                  }}
                >
                  <img src={s.fullTile} alt={s.label} className="w-full h-full object-contain" draggable={false} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Shop ── */}
        <div>
          <p className="text-[13px] font-semibold mb-2 tracking-wide" style={{ color: 'var(--text-2)' }}>店铺</p>
          <button
            onClick={() => navigate('shop-search', { _restore: { emoji, photo, cutout, cutoutProvider, rating, note, date, shopName, city, aiResult } })}
            className="w-full rounded-[12px] px-4 py-3 text-left border"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          >
            <span style={{ color: shopName ? 'var(--text-1)' : 'var(--text-2)', fontWeight: shopName ? 500 : 400 }}>
              {shopName || '搜索店铺...'}
            </span>
          </button>
          {city && <p className="text-[13px] mt-1.5 px-1" style={{ color: 'var(--text-2)' }}>{city}</p>}
        </div>

        {/* ── Photo + AI ── */}
        <div>
          <p className="text-[13px] font-semibold mb-2 tracking-wide" style={{ color: 'var(--text-2)' }}>照片</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

          {photo ? (
            <div className="flex flex-col gap-3">
              {/* Photo preview */}
              <div className="relative rounded-[16px] overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setPhoto(null); setAiResult(null); setAiError(null); setCutout(null); setCutoutProvider(null); base64Ref.current = null }}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white active:opacity-70"
                  style={{ background: 'rgba(0,0,0,0.45)' }}
                >✕</button>
                {cutoutLoading && (
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    正在抠图...
                  </div>
                )}
                {cutout && !cutoutLoading && (
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white" style={{ background: 'rgba(0,0,0,0.45)' }}>
                    抠图完成 · {CUTOUT_PROVIDER_LABELS[cutoutProvider] || cutoutProvider || '未知来源'} ✓
                  </div>
                )}
              </div>

              {/* AI banner */}
              {aiLoading && (
                <div className="rounded-[14px] px-4 py-3 flex items-center gap-3"
                  style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                  <span className="text-lg">✨</span>
                  <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>AI 正在识别食物...</p>
                </div>
              )}

              {aiError && (
                <div className="rounded-[14px] px-4 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)' }}>
                  <p className="text-[13px] text-[#FF3B30]">⚠️ {aiError}</p>
                  <button onClick={() => runRecognition(note)} className="text-[13px] font-semibold" style={{ color }}>重试</button>
                </div>
              )}

              {aiResult && !aiLoading && (
                <div className="rounded-[14px] px-4 py-3"
                  style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-[15px]" style={{ color: 'var(--text-1)' }}>
                        ✨ {aiResult.name}
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>{aiResult.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-display font-bold text-[22px] leading-none" style={{ color }}>{aiResult.calories}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-2)' }}>kcal</p>
                    </div>
                  </div>

                  {/* Macros row */}
                  <div className="flex gap-3 mb-3">
                    {[
                      { label: '碳水', value: aiResult.carbs, col: '#F5A623' },
                      { label: '蛋白质', value: aiResult.protein, col: '#5B8A5F' },
                      { label: '脂肪', value: aiResult.fat, col: color },
                    ].map(m => (
                      <div key={m.label} className="flex-1 text-center py-1.5 rounded-[10px]"
                        style={{ background: 'rgba(255,255,255,0.6)' }}>
                        <p className="font-semibold text-[14px]" style={{ color: m.col }}>{m.value}g</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-2)' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Re-recognize with note */}
                  <button
                    onClick={() => runRecognition(note)}
                    className="w-full py-2 rounded-[10px] text-[12px] font-semibold active:opacity-60"
                    style={{ background: `${color}20`, color }}
                  >
                    {note ? '根据备注重新识别 →' : '重新识别'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-[16px] border-2 border-dashed flex flex-col items-center justify-center py-9 gap-2 active:opacity-60"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-3xl">📷</span>
              <span className="text-[14px]" style={{ color: 'var(--text-2)' }}>添加照片</span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>上传后自动识别热量</span>
            </button>
          )}
        </div>

        {/* ── Rating ── */}
        <div>
          <p className="text-[13px] font-semibold mb-2 tracking-wide" style={{ color: 'var(--text-2)' }}>评分</p>
          <div className="flex gap-3">
            {[1,2,3,4,5].map(r => (
              <button key={r} onClick={() => setRating(r)} className="text-[32px] active:scale-90 transition-transform">
                <span style={{ color: r <= rating ? '#FFCC00' : 'var(--border)' }}>★</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Note ── */}
        <div>
          <p className="text-[13px] font-semibold mb-2 tracking-wide" style={{ color: 'var(--text-2)' }}>
            备注
            {photo && aiResult && <span className="ml-1 font-normal text-[11px]" style={{ color: 'var(--text-3)' }}>（填写后可重新识别，提升准确度）</span>}
          </p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={photo ? '例如：燕麦拿铁，中杯，少糖...' : '记录一下...'}
            rows={3}
            className="w-full rounded-[12px] px-4 py-3 border resize-none outline-none"
            style={{ background: 'var(--bg)', color: 'var(--text-1)', borderColor: 'var(--border)' }}
          />
        </div>

        {/* ── Date ── */}
        <div>
          <p className="text-[13px] font-semibold mb-2 tracking-wide" style={{ color: 'var(--text-2)' }}>日期</p>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-[12px] px-4 py-3 border outline-none"
            style={{ background: 'var(--bg)', color: 'var(--text-1)', borderColor: 'var(--border)' }}
          />
        </div>

      </div>
    </div>
  )
}
