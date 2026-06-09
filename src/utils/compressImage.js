export async function compressImageDataUrl(dataUrl, options = {}) {
  const maxSide = options.maxSide || 768
  const quality = options.quality || 0.72

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const sourceW = img.naturalWidth || img.width
      const sourceH = img.naturalHeight || img.height
      if (!sourceW || !sourceH) {
        resolve(dataUrl)
        return
      }

      const scale = Math.min(1, maxSide / Math.max(sourceW, sourceH))
      const width = Math.max(1, Math.round(sourceW * scale))
      const height = Math.max(1, Math.round(sourceH * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      const compressed = canvas.toDataURL('image/jpeg', quality)
      resolve(compressed.length < dataUrl.length ? compressed : dataUrl)
    }
    img.onerror = () => reject(new Error('图片压缩失败'))
    img.src = dataUrl
  })
}

export async function compressTransparentImageDataUrl(dataUrl, options = {}) {
  const maxSide = options.maxSide || 960
  const quality = options.quality || 0.82

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const sourceW = img.naturalWidth || img.width
      const sourceH = img.naturalHeight || img.height
      if (!sourceW || !sourceH) {
        resolve(dataUrl)
        return
      }

      const scale = Math.min(1, maxSide / Math.max(sourceW, sourceH))
      const width = Math.max(1, Math.round(sourceW * scale))
      const height = Math.max(1, Math.round(sourceH * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      const webp = canvas.toDataURL('image/webp', quality)
      const png = canvas.toDataURL('image/png')
      const candidates = [webp, png, dataUrl]
        .filter(Boolean)
        .filter(candidate => candidate.startsWith('data:image/'))
      resolve(candidates.reduce((best, candidate) => (
        candidate.length < best.length ? candidate : best
      ), dataUrl))
    }
    img.onerror = () => reject(new Error('透明图片压缩失败'))
    img.src = dataUrl
  })
}
