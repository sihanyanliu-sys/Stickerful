import { useId } from 'react'

// ── Brand colours ─────────────────────────────────────────────────
// Default brand color; can be overridden per-instance via the `color` prop
// so the stamp preview cards re-tint when the user picks a different colour.
const DEFAULT_BRAND = '#C98D48'
const WHITE = '#FFFFFF'
const FONT  = `system-ui, -apple-system, 'Inter', 'PingFang SC', sans-serif`

// ── Geometry helpers ──────────────────────────────────────────────

/** 10-sided polygon point string */
function decaPts(cx, cy, R) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    return `${(cx + R * Math.cos(a)).toFixed(2)},${(cy + R * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

/** Scalloped path: n all-outward bumps (cos² formula → never goes inward) */
function scallopPath(cx, cy, R, n, amp, steps = 720) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 - Math.PI / 2
    const r = R + (amp / 2) * (1 + Math.cos(n * t))
    pts.push(`${(cx + r * Math.cos(t)).toFixed(2)},${(cy + r * Math.sin(t)).toFixed(2)}`)
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`
}

/** Fine zigzag circle (sawtooth teeth) */
function zigzagPath(cx, cy, Ro, Ri, n) {
  const total = n * 2
  const pts = []
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? Ro : Ri
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`
}

// ── Coffee-cup illustration (embedded SVG) ────────────────────────
//   fits in a 56×76 coordinate space
function CoffeeCup({ cx = 90, cy = 90, fg = DEFAULT_BRAND, bg = WHITE }) {
  // Place the cup so its visual centre is near (cx, cy)
  const W = 48, H = 66
  const x = cx - W / 2
  const y = cy - H / 2 - 2   // shift slightly above centre

  return (
    <svg x={x} y={y} width={W} height={H} viewBox="0 0 56 76" overflow="visible">
      {/* Sipper spout */}
      <rect x="20" y="6" width="16" height="7" rx="3.5" fill={bg} stroke={fg} strokeWidth="1.2"/>

      {/* Dome lid */}
      <ellipse cx="28" cy="13" rx="19.5" ry="5" fill={bg} stroke={fg} strokeWidth="1.2"/>
      <rect x="9"  y="11" width="38" height="6" rx="3" fill={bg}/>
      <ellipse cx="28" cy="17" rx="19" ry="3.5" fill={bg} stroke={fg} strokeWidth="0.8"/>

      {/* Cup body (slightly tapered) */}
      <path d="M 9,18 L 12,65 Q 28,70 44,65 L 47,18 Z"
            fill={bg} stroke={fg} strokeWidth="1.2"/>

      {/* Sleeve / band */}
      <path d="M 13,36 L 15.5,57 Q 28,61 40.5,57 L 43,36 Z" fill={fg}/>

      {/* Badge on sleeve */}
      <ellipse cx="28" cy="47" rx="11.5" ry="8.5" fill={bg}/>
      <text x="28" y="45.5" fontSize="5.5" fontWeight="700" fill={fg}
            textAnchor="middle" fontFamily={FONT}>Sticker</text>
      <text x="28" y="52"   fontSize="5.5" fontWeight="700" fill={fg}
            textAnchor="middle" fontFamily={FONT}>ful</text>

      {/* Cup bottom ellipse */}
      <ellipse cx="28" cy="65.5" rx="16" ry="4" fill={fg} opacity="0.15"/>
    </svg>
  )
}

// ── Main StampCard ────────────────────────────────────────────────
/**
 * shape  : 'decagon' | 'wave' | 'circle'
 * theme  : 'light' | 'brown'
 * topText, bottomText : arc-curved label strings
 * centerText          : '\n'-joined lines for centre (ignored when showCup)
 * showCup             : render coffee cup illustration
 * selected, onClick   : selection state
 * size                : rendered px side length (default 160)
 */
export default function StampCard({
  shape      = 'decagon',
  theme      = 'light',
  topText    = 'STICKERFUL',
  centerText,
  bottomText,
  showCup    = false,
  selected   = false,
  onClick,
  size       = 160,
  color      = DEFAULT_BRAND,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '_')

  const bg = theme === 'brown' ? color : WHITE
  const fg = theme === 'brown' ? WHITE : color

  // Coordinate system: 180 × 180 viewBox, centred at (90, 90)
  const cx = 90, cy = 90

  // ── Arc text paths (circular arcs, R=64) ──
  const R = 56
  // counterclockwise → through TOP   (sweep=0)
  const topArcD = `M ${cx - R},${cy} A ${R},${R} 0 0,0 ${cx + R},${cy}`
  // clockwise       → through BOTTOM (sweep=1)
  const botArcD = `M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`

  const fs = 10.5         // arc font-size
  const ls = 2.5          // letter-spacing
  // dy for TOP arc: push glyphs DOWN (into stamp) by ≈1 font-size
  const dyTop = fs * 1.0
  // dy for BOTTOM arc: tiny positive push keeps caps inside the border
  const dyBot = 2

  const dateLines = centerText ? centerText.split('\n') : []

  return (
    <button
      onClick={onClick}
      className="flex-none rounded-[24px] overflow-hidden transition-all duration-200
                 hover:scale-[1.03] active:scale-[0.97] focus:outline-none"
      style={{
        width: size, height: size,
        boxShadow: selected
          ? `0 0 0 3px ${color}, 0 6px 20px ${color}47`
          : '0 3px 14px rgba(0,0,0,0.10)',
      }}
    >
      <svg viewBox="0 0 180 180" width={size} height={size}>
        <defs>
          <path id={`${uid}T`} d={topArcD}/>
          <path id={`${uid}B`} d={botArcD}/>
        </defs>

        {/* ── Card background ── */}
        <rect width="180" height="180" rx="24" fill={bg}/>

        {/* ──────────────────────────────────────────────────────── */}
        {/* SHAPE: Decagon (used for both light & brown themes)      */}
        {/* ──────────────────────────────────────────────────────── */}
        {shape === 'decagon' && (
          <polygon
            points={decaPts(cx, cy, 76)}
            fill="none" stroke={fg} strokeWidth="4" strokeLinejoin="round"
          />
        )}

        {shape === 'round' && (
          <circle cx={cx} cy={cy} r={76} fill="none" stroke={fg} strokeWidth="3.5"/>
        )}

        {/* ──────────────────────────────────────────────────────── */}
        {/* SHAPE: Scalloped / wave                                  */}
        {/* ──────────────────────────────────────────────────────── */}
        {shape === 'wave' && (
          <path
            d={scallopPath(cx, cy, 72, 12, 9)}
            fill="none" stroke={fg} strokeWidth="2.8"
          />
        )}

        {/* ──────────────────────────────────────────────────────── */}
        {/* SHAPE: Circle with fine zigzag teeth                     */}
        {/* ──────────────────────────────────────────────────────── */}
        {shape === 'circle' && (
          <path
            d={zigzagPath(cx, cy, 71, 65, 48)}
            fill="none" stroke={fg} strokeWidth="1.5"
          />
        )}

        {/* ── Coffee cup illustration ── */}
        {showCup && (
          <CoffeeCup
            cx={cx}
            cy={cy + 4}
            fg={fg}
            bg={theme === 'brown' ? 'rgba(255,255,255,0.97)' : color}
          />
        )}

        {/* ── Centre date text (no cup) ── */}
        {!showCup && dateLines.length > 0 && dateLines.map((line, i) => (
          <text
            key={i}
            x={cx}
            y={cy - ((dateLines.length - 1) * 11) + i * 23 - (dateLines.length > 1 ? 1 : 0)}
            fill={fg}
            fontSize={i === 0 ? 20 : 17}
            fontFamily={FONT}
            fontWeight="700"
            textAnchor="middle"
          >{line}</text>
        ))}

        {/* ── Top arc text ── */}
        {topText && (
          <text
            fill={fg}
            fontSize={fs}
            fontFamily={FONT}
            fontWeight="700"
            letterSpacing={ls}
          >
            <textPath
              href={`#${uid}T`}
              startOffset="50%"
              textAnchor="middle"
              dy={dyTop}
            >
              {topText}
            </textPath>
          </text>
        )}

        {/* ── Bottom arc text ── */}
        {bottomText && (
          <text
            fill={fg}
            fontSize={fs}
            fontFamily={FONT}
            fontWeight="700"
            letterSpacing={ls}
          >
            <textPath
              href={`#${uid}B`}
              startOffset="50%"
              textAnchor="middle"
              dy={dyBot}
            >
              {bottomText}
            </textPath>
          </text>
        )}
      </svg>
    </button>
  )
}
