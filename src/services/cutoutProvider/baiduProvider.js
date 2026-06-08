import { addStickerOutline } from '../../utils/removeBackground'

const BAIDU_CUTOUT_ENDPOINT = import.meta.env.VITE_BAIDU_CUTOUT_ENDPOINT || '/api/remove-background'
const BAIDU_MAX_SIDE = 1800
const BAIDU_HARD_MAX_SIDE = 3000
const BAIDU_MIN_SIDE = 128
const BAIDU_MAX_BASE64_CHARS = 3.2 * 1024 * 1024

export const providerName = 'baidu'

export function isAvailable() {
  return typeof document !== 'undefined' && typeof fetch !== 'undefined'
}

function getBase64Payload(dataUrl) {
  return String(dataUrl || '').split(',')[1] || ''
}

function needsBaiduResize(dataUrl, width, height) {
  const maxSide = Math.max(width, height)
  const minSide = Math.min(width, height)
  return maxSide > BAIDU_HARD_MAX_SIDE ||
    minSide < BAIDU_MIN_SIDE ||
    getBase64Payload(dataUrl).length > BAIDU_MAX_BASE64_CHARS
}

function canvasToJpegDataUrl(img, width, height, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

async function prepareBaiduCutoutImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const sourceW = img.naturalWidth || img.width
      const sourceH = img.naturalHeight || img.height
      if (!sourceW || !sourceH) {
        resolve(dataUrl)
        return
      }

      if (!needsBaiduResize(dataUrl, sourceW, sourceH)) {
        resolve(dataUrl)
        return
      }

      let maxSide = Math.min(BAIDU_MAX_SIDE, Math.max(sourceW, sourceH))
      let quality = 0.88
      let output = dataUrl

      for (let attempt = 0; attempt < 8; attempt++) {
        const scale = Math.min(1, maxSide / Math.max(sourceW, sourceH))
        const width = Math.max(BAIDU_MIN_SIDE, Math.round(sourceW * scale))
        const height = Math.max(BAIDU_MIN_SIDE, Math.round(sourceH * scale))
        output = canvasToJpegDataUrl(img, width, height, quality)

        if (getBase64Payload(output).length <= BAIDU_MAX_BASE64_CHARS) break

        if (quality > 0.68) {
          quality -= 0.1
        } else {
          maxSide = Math.max(1024, Math.floor(maxSide * 0.82))
        }
      }

      resolve(output)
    }
    img.onerror = () => reject(new Error('百度抠图前图片压缩失败'))
    img.src = dataUrl
  })
}

export async function createCutout(imageDataUrl) {
  const baiduReadyImage = await prepareBaiduCutoutImage(imageDataUrl)
  const response = await fetch(BAIDU_CUTOUT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: baiduReadyImage }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || `百度智能抠图请求失败：${response.status}`)
  }

  const transparentImage = payload?.image || payload?.cutout || payload?.dataUrl
  if (!transparentImage) throw new Error('百度智能抠图没有返回透明图片')

  const transparentBlob = await fetch(transparentImage).then(res => res.blob())
  return addStickerOutline(transparentBlob)
}
