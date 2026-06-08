import { useSettings } from '../context/SettingsContext'
import { stickerMap } from '../stickerData'

const SIZE = {
  sm: { outer: 36, font: '18px' },
  md: { outer: 44, font: '24px' },
  lg: { outer: 96, font: '52px' },
}

export default function StampIcon({ emoji, photo, size = 'md', overrideColor }) {
  const { settings } = useSettings()
  const color = overrideColor ?? settings.stampColor ?? '#C98D48'
  const { outer, font } = SIZE[size] || SIZE.md

  if (photo) {
    return (
      <div style={{
        width: outer,
        height: outer,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        border: '2.5px solid #ffffff',
        boxShadow: `0 0 0 2px ${color}50`,
      }}>
        <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }

  const sticker = stickerMap.get(emoji)
  if (sticker) {
    return (
      <div style={{
        width: outer,
        height: outer,
        borderRadius: '50%',
        background: `${color}18`,
        border: `2.5px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 4,
        overflow: 'hidden',
      }}>
        <img src={sticker.transparentIcon} alt={sticker.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
      </div>
    )
  }

  return (
    <div style={{
      width: outer,
      height: outer,
      borderRadius: '50%',
      background: `${color}18`,
      border: `2.5px solid ${color}30`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontSize: font,
      lineHeight: 1,
    }}>
      {emoji}
    </div>
  )
}
