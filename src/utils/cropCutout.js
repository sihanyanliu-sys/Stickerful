// Crop a transparent-background PNG dataURL to the bounding box of its
// non-transparent pixels. Returns a new dataURL, or the original if nothing
// non-transparent is found.
export function cropToBBox(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const x = c.getContext('2d')
      x.drawImage(img, 0, 0)
      const px = x.getImageData(0, 0, W, H).data

      let minX = W, minY = H, maxX = -1, maxY = -1
      for (let y = 0; y < H; y++) {
        for (let xi = 0; xi < W; xi++) {
          // alpha > 16: ignore "ghost" pixels (alpha 1-15) left by the bg
          // removal model — they're invisible but inflate the bbox and shift
          // the visual center.
          if (px[(y * W + xi) * 4 + 3] > 16) {
            if (xi < minX) minX = xi
            if (xi > maxX) maxX = xi
            if (y  < minY) minY = y
            if (y  > maxY) maxY = y
          }
        }
      }
      if (maxX < 0) { resolve(dataUrl); return }

      const cw = maxX - minX + 1
      const ch = maxY - minY + 1
      if (cw === W && ch === H) { resolve(dataUrl); return }

      const out = document.createElement('canvas')
      out.width = cw; out.height = ch
      out.getContext('2d').drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch)
      resolve(out.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
