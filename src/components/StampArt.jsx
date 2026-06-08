import { useId, useRef, useState, useLayoutEffect } from 'react'
import { stickerMap } from '../stickerData'

const FONT = "Georgia, 'Times New Roman', serif"

function scallopPath(cx, cy, R, n, amp, steps = 720) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI - Math.PI / 2
    const r = R + (amp / 2) * (1 + Math.cos(n * theta))
    pts.push(`${(cx + r * Math.cos(theta)).toFixed(2)},${(cy + r * Math.sin(theta)).toFixed(2)}`)
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`
}

function polyPts(cx, cy, R, n) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2
    return `${(cx + R * Math.cos(a)).toFixed(2)},${(cy + R * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

function fmtDateDot(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getDate()}.${d.getFullYear()}`
  } catch { return '05.14.2026' }
}

export default function StampArt({ shape, color, shopName, date, emoji, photo, cutout, size = 200 }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '_')

  const cx = size / 2, cy = size / 2
  const col = color || '#C98D48'

  // NOTE on naming: with sweep-flag 0 + SVG y-down coords, `shopArcD` actually
  // curves through the BOTTOM of the stamp (text appears at bottom), and
  // `dateArcD` (sweep 1) curves through the TOP. The id suffixes T/B reflect
  // the original misnaming and are kept stable for snapshot/dom hooks.
  // Both arcs at same radius. dy is applied per-arc to make the visible
  // outer-most edge of each text sit at the same distance from the border:
  //   shop (bottom): outer edge = baseline (no descender for CJK/uppercase)
  //   date (top):    outer edge = baseline + ascender (digits' tops point out)
  // So dyBot must compensate by pushing baseline further inward by ~ascender.
  // dy on textPath isn't reliably honored across browsers for path-normal
  // offsets, so position is controlled purely by arc radius.
  // rDate is smaller than rShop because date ascenders extend OUTWARD toward
  // the border — pulling the baseline inward keeps the outer edge symmetric
  // with the shop name's baseline (whose chars have no ascender extending out).
  const rShop = size * 0.36
  const rDate = size * 0.323
  const shopArcD = `M ${cx - rShop},${cy} A ${rShop},${rShop} 0 0,0 ${cx + rShop},${cy}`
  const dateArcD = `M ${cx - rDate},${cy} A ${rDate},${rDate} 0 0,1 ${cx + rDate},${cy}`

  const fs    = size * 0.058
  const dyTop = fs * 0.15
  const dyBot = 0

  const shopDisplay = (shopName || 'COFFEE').toUpperCase()
  const dateStr = fmtDateDot(date)

  // Shrink shop-name font when it doesn't fit the arc. Arc geometry is fixed.
  // We render hidden at base size, measure actual textLength, then scale fs
  // and letterSpacing down (floor 0.55) to fit. Arc usable length leaves a
  // small margin (94%) so first/last glyphs aren't clipped by path ends.
  const shopBaseFs       = fs
  const shopBaseLetterSp = size * 0.012
  const arcUsable        = Math.PI * rShop * 0.94
  const measureRef = useRef(null)
  const [shopScale, setShopScale] = useState(1)
  useLayoutEffect(() => {
    setShopScale(1)
  }, [shopDisplay, size])
  useLayoutEffect(() => {
    const node = measureRef.current
    if (!node) return
    const w = node.getComputedTextLength?.() || 0
    if (w === 0) return
    const target = w > arcUsable ? Math.max(0.55, arcUsable / w) : 1
    if (Math.abs(target - shopScale) > 0.005) setShopScale(target)
  }, [shopDisplay, size, arcUsable, shopScale])
  const shopFs    = shopBaseFs * shopScale
  const shopLetSp = shopBaseLetterSp * shopScale

  // Photo circle geometry
  const imgR = size * 0.24         // radius of photo circle in stamp center

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <path id={`${uid}T`} d={shopArcD} />
        <path id={`${uid}B`} d={dateArcD} />
        {photo && (
          <clipPath id={`${uid}clip`}>
            <circle cx={cx} cy={cy} r={imgR} />
          </clipPath>
        )}
        <filter id={`${uid}cutoutShadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy={size * 0.008} stdDeviation={size * 0.018} floodColor="rgba(0,0,0,0.28)" />
        </filter>
      </defs>

      {/* Card background */}
      <rect width={size} height={size} rx={size * 0.1} fill="white" />

      {/* ── Border shape — outline only, no inner ring ── */}
      {shape === 'wave' && (
        <path
          d={scallopPath(cx, cy, size * 0.39, 12, size * 0.058)}
          fill="none" stroke={col} strokeWidth={size * 0.018}
        />
      )}
      {shape === 'decagon' && (
        <polygon
          points={polyPts(cx, cy, size * 0.43, 10)}
          fill="none" stroke={col} strokeWidth={size * 0.022} strokeLinejoin="round"
        />
      )}
      {shape === 'square' && (
        <rect
          x={size * 0.09} y={size * 0.09}
          width={size * 0.82} height={size * 0.82}
          rx={size * 0.065}
          fill="none" stroke={col} strokeWidth={size * 0.022}
        />
      )}
      {(shape === 'round' || !shape) && (
        <circle cx={cx} cy={cy} r={size * 0.42} fill="none" stroke={col} strokeWidth={size * 0.018} />
      )}

      {/* ── Center: cutout (transparent PNG with white border), photo, sticker, or emoji ── */}
      {cutout ? (
        <image
          href={cutout}
          x={cx - imgR * 0.9} y={cy - imgR * 0.9}
          width={imgR * 1.8} height={imgR * 1.8}
          preserveAspectRatio="xMidYMid meet"
          filter={`url(#${uid}cutoutShadow)`}
        />
      ) : photo ? (
        <>
          <circle cx={cx} cy={cy} r={imgR + size * 0.022} fill="white"
            style={{ filter: `drop-shadow(0 2px ${size*0.025}px rgba(44,24,16,0.13))` }} />
          <image
            href={photo}
            x={cx - imgR} y={cy - imgR}
            width={imgR * 2} height={imgR * 2}
            clipPath={`url(#${uid}clip)`}
            preserveAspectRatio="xMidYMid slice"
          />
          <circle cx={cx} cy={cy} r={imgR} fill="none" stroke="white" strokeWidth={size * 0.022} />
        </>
      ) : stickerMap.has(emoji) ? (
        <image
          href={stickerMap.get(emoji).transparentIcon}
          x={cx - imgR * 1.1} y={cy - imgR * 1.1}
          width={imgR * 2.2} height={imgR * 2.2}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <text
          x={cx} y={cy + size * 0.04}
          fontSize={size * 0.25}
          textAnchor="middle"
          dominantBaseline="middle"
        >{emoji || '☕'}</text>
      )}

      {/* Hidden measurement node — base fs, base spacing, no path. Used to
          compute natural text length so we can scale fs to fit the arc. */}
      <text
        ref={measureRef}
        x={-9999} y={-9999}
        fontSize={shopBaseFs} fontFamily={FONT} fontWeight="bold"
        letterSpacing={shopBaseLetterSp}
        style={{ visibility: 'hidden' }}
      >
        {shopDisplay}
      </text>

      {/* ── Top arc: shop name ── */}
      <text fill={col} fontSize={shopFs} fontFamily={FONT} fontWeight="bold" letterSpacing={shopLetSp}>
        <textPath href={`#${uid}T`} startOffset="50%" textAnchor="middle" dy={dyTop}>
          {shopDisplay}
        </textPath>
      </text>

      {/* ── Bottom arc: date ── */}
      <text fill={col} fontSize={fs * 0.9} fontFamily={FONT} fontWeight="bold" letterSpacing={size * 0.010}>
        <textPath href={`#${uid}B`} startOffset="50%" textAnchor="middle" dy={dyBot}>
          {dateStr}
        </textPath>
      </text>
    </svg>
  )
}
