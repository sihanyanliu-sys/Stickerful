import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers'

// ─────────────────────────────────────────────────────────────────────────────
// 主入口：抠图 + 加白边
// 抠图：briaai/RMBG-1.4（BiRefNet 架构，Transformers.js / ONNX 浏览器推理）
// 白边：完整移植自 sticker_server.py → add_white_outline（scipy EDT 逻辑）
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_ID = 'briaai/RMBG-1.4'

let bgModelPromise = null
function loadBgModel() {
  if (!bgModelPromise) {
    bgModelPromise = Promise.all([
      AutoModel.from_pretrained(MODEL_ID, { config: { model_type: 'custom' } }),
      AutoProcessor.from_pretrained(MODEL_ID, {
        config: {
          do_normalize:           true,
          do_pad:                 false,
          do_rescale:             true,
          do_resize:              true,
          image_mean:             [0.5, 0.5, 0.5],
          feature_extractor_type: 'ImageFeatureExtractor',
          image_std:              [1, 1, 1],
          resample:               2,
          rescale_factor:         0.00392156862745098,
          size:                   { width: 1024, height: 1024 },
        },
      }),
    ]).catch(err => { bgModelPromise = null; throw err })
  }
  return bgModelPromise
}

// Run inference and return an RGBA Blob (PNG) of the original image with
// alpha = predicted foreground mask. Shape matches what imgly used to return.
async function cutoutWithHF(blob) {
  const [model, processor] = await loadBgModel()
  const image = await RawImage.fromBlob(blob)
  const { pixel_values } = await processor(image)
  const { output } = await model({ input: pixel_values })
  const maskRaw = await RawImage.fromTensor(output[0].mul(255).to('uint8'))
    .resize(image.width, image.height)
  const maskData = maskRaw.data

  const c = document.createElement('canvas')
  c.width = image.width; c.height = image.height
  const x = c.getContext('2d')
  x.drawImage(image.toCanvas(), 0, 0)
  const pixels = x.getImageData(0, 0, image.width, image.height)
  for (let i = 0; i < maskData.length; i++) {
    pixels.data[4 * i + 3] = maskData[i]
  }
  x.putImageData(pixels, 0, 0)
  return await new Promise(r => c.toBlob(r, 'image/png'))
}

export async function removeBackground(dataUrl) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()

  // Step 1: 抠图，输出透明 PNG（RMBG-1.4 / BiRefNet）
  const resultBlob = await cutoutWithHF(blob)

  return addStickerOutline(resultBlob)
}

export function addStickerOutline(resultBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // 对应 Python: MAX_SIDE = 1024
      const MAX = 1024
      const sc = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight))
      const W = Math.round(img.naturalWidth * sc)
      const H = Math.round(img.naturalHeight * sc)

      // 对应 Python: outline_px = int(np.clip(round(max_side * 0.052), 16, 28))
      const outlinePx = Math.min(28, Math.max(16, Math.round(Math.max(W, H) * 0.052)))
      const feather = 1.35          // 外边缘羽化宽度（像素）
      const pad = outlinePx * 3     // 对应 Python: pad = outline_px * 3

      // 带 padding 的画布尺寸，对应 Python: placed
      const OW = W + pad * 2
      const OH = H + pad * 2

      // ── 将抠图结果画入 padded 画布 ──────────────────────────────────────
      const placedC = document.createElement('canvas')
      placedC.width = OW; placedC.height = OH
      const placedX = placedC.getContext('2d')
      placedX.drawImage(img, pad, pad, W, H)
      const placedPixels = placedX.getImageData(0, 0, OW, OH).data

      // ── 提取二值 mask（alpha > 8 = 前景）────────────────────────────────
      // 对应 Python: mask = alpha > 8
      const mask = new Uint8Array(OW * OH)
      for (let i = 0; i < OW * OH; i++) {
        mask[i] = placedPixels[i * 4 + 3] > 8 ? 1 : 0
      }

      // ── 欧氏距离变换：每个背景像素到最近前景像素的距离 ───────────────────
      // 对应 Python: ndimage.distance_transform_edt(~mask)
      const dist = computeEDT(mask, OW, OH)

      // ── 计算 outline_alpha ───────────────────────────────────────────────
      // 对应 Python:
      //   edge = clip((outline_px + feather - dist) / (feather*2), 0, 1)
      //   outline_alpha = where(dist <= outline_px - feather, 1.0, edge)
      //   outline_alpha[mask] = 1.0
      const outlineAlpha = new Uint8Array(OW * OH)
      for (let i = 0; i < OW * OH; i++) {
        if (mask[i]) {
          outlineAlpha[i] = 255  // 前景像素：白色层完全不透明
        } else {
          const d = dist[i]
          const t = d <= outlinePx - feather
            ? 1.0
            : Math.max(0, Math.min(1, (outlinePx + feather - d) / (feather * 2)))
          outlineAlpha[i] = Math.round(t * 255)
        }
      }

      // ── 白色层画布 ───────────────────────────────────────────────────────
      // 对应 Python: white = Image.new("RGBA", ..., (255,255,255,0)); white.putalpha(outline_alpha)
      const whiteC = document.createElement('canvas')
      whiteC.width = OW; whiteC.height = OH
      const whiteX = whiteC.getContext('2d')
      const whiteId = whiteX.createImageData(OW, OH)
      for (let i = 0; i < OW * OH; i++) {
        const pi = i * 4
        whiteId.data[pi]     = 255
        whiteId.data[pi + 1] = 255
        whiteId.data[pi + 2] = 255
        whiteId.data[pi + 3] = outlineAlpha[i]
      }
      whiteX.putImageData(whiteId, 0, 0)

      // ── 阴影层：outline_alpha → Gaussian blur → 11% 不透明度 ─────────────
      // 对应 Python:
      //   shadow_alpha = outline_alpha.filter(GaussianBlur(max(3, outline_px//4)))
      //   shadow.putalpha(shadow_alpha.point(lambda v: int(v * 0.11)))
      const shadowBlurR = Math.max(3, Math.round(outlinePx / 4))
      const shadowRawC = document.createElement('canvas')
      shadowRawC.width = OW; shadowRawC.height = OH
      const shadowRawX = shadowRawC.getContext('2d')
      const shadowId = shadowRawX.createImageData(OW, OH)
      for (let i = 0; i < OW * OH; i++) {
        shadowId.data[i * 4 + 3] = outlineAlpha[i]  // 黑色，alpha = outlineAlpha
      }
      shadowRawX.putImageData(shadowId, 0, 0)

      const shadowBlurC = document.createElement('canvas')
      shadowBlurC.width = OW; shadowBlurC.height = OH
      const shadowBlurX = shadowBlurC.getContext('2d')
      shadowBlurX.filter = `blur(${shadowBlurR}px)`
      shadowBlurX.drawImage(shadowRawC, 0, 0)

      // ── 合成：阴影 → 白边 → 原图 ────────────────────────────────────────
      // 对应 Python:
      //   canvas.alpha_composite(shadow, (0, 3))
      //   canvas.alpha_composite(white)
      //   canvas.alpha_composite(placed)
      const out = document.createElement('canvas')
      out.width = OW; out.height = OH
      const outX = out.getContext('2d')

      outX.globalAlpha = 0.11          // shadow 以 11% 不透明度叠加
      outX.drawImage(shadowBlurC, 0, 3) // offset (0, 3)，对应 Python 的 (0, 3)
      outX.globalAlpha = 1.0
      outX.drawImage(whiteC, 0, 0)     // 白色轮廓层
      outX.drawImage(placedC, 0, 0)    // 原图盖在最上方

      // ── 裁切到非透明像素边界框 ─────────────────────────────────────────
      // 让保存的 PNG 紧贴贴纸本体，避免画布上下文带来视觉大小不一致
      const outPixels = outX.getImageData(0, 0, OW, OH).data
      let minX = OW, minY = OH, maxX = -1, maxY = -1
      for (let y = 0; y < OH; y++) {
        for (let x = 0; x < OW; x++) {
          // alpha > 16: skip ghost pixels (alpha 1-15) that inflate the bbox
          if (outPixels[(y * OW + x) * 4 + 3] > 16) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
      if (maxX >= 0) {
        const cw = maxX - minX + 1
        const ch = maxY - minY + 1
        const cropped = document.createElement('canvas')
        cropped.width = cw; cropped.height = ch
        cropped.getContext('2d').drawImage(out, minX, minY, cw, ch, 0, 0, cw, ch)
        resolve(cropped.toDataURL('image/png'))
      } else {
        resolve(out.toDataURL('image/png'))
      }
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(resultBlob)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Felzenszwalb 欧氏距离变换（O(W×H)）
// 移植自 scipy.ndimage.distance_transform_edt 的同款算法
// 输入：mask（1=前景, 0=背景），W, H
// 输出：Float32Array，每个像素到最近前景像素的精确欧氏距离（前景像素距离=0）
// ─────────────────────────────────────────────────────────────────────────────
function computeEDT(mask, W, H) {
  const LARGE = (W + H + 2) ** 2

  // Phase 1：逐列计算每个像素到同列最近前景像素的最小 Y 方向平方距离
  const g = new Float32Array(W * H).fill(LARGE)
  for (let x = 0; x < W; x++) {
    // 向下扫描：记录最近的上方前景行
    let lastFg = -1
    for (let y = 0; y < H; y++) {
      if (mask[y * W + x]) {
        lastFg = y
        g[y * W + x] = 0
      } else if (lastFg >= 0) {
        const dy = y - lastFg
        g[y * W + x] = dy * dy
      }
    }
    // 向上扫描：如果下方前景更近则更新
    let nextFg = -1
    for (let y = H - 1; y >= 0; y--) {
      if (mask[y * W + x]) {
        nextFg = y
      } else if (nextFg >= 0) {
        const dy = nextFg - y
        const d2 = dy * dy
        if (d2 < g[y * W + x]) g[y * W + x] = d2
      }
    }
  }

  // Phase 2：逐行用抛物线下包络求精确欧氏距离
  const dist = new Float32Array(W * H)
  const v = new Int32Array(W)      // 包络中各抛物线的列索引
  const z = new Float32Array(W + 1) // 相邻抛物线的分界点

  for (let y = 0; y < H; y++) {
    const base = y * W
    let k = -1  // 当前包络中最后一条抛物线的索引

    // 建立下包络
    for (let q = 0; q < W; q++) {
      const fq = g[base + q]
      if (fq >= LARGE) continue  // 该列无前景，跳过
      let s
      while (k >= 0) {
        const r = v[k]
        const fr = g[base + r]
        // 抛物线 (x-q)²+fq 与 (x-r)²+fr 的交点
        s = ((fq + q * q) - (fr + r * r)) / (2 * (q - r))
        if (s > z[k]) break  // 新抛物线在 z[k] 右侧接管
        k--                   // 当前末尾抛物线被新抛物线完全覆盖，弹出
      }
      k++
      v[k]     = q
      z[k]     = k === 0 ? -Infinity : s
      z[k + 1] = Infinity
    }

    // 无有效前景像素
    if (k < 0) {
      for (let x = 0; x < W; x++) dist[base + x] = LARGE
      continue
    }

    // 用下包络填充每列的精确距离
    let ek = 0
    for (let x = 0; x < W; x++) {
      while (ek < k && z[ek + 1] < x) ek++
      const r = v[ek]
      const dx = x - r
      dist[base + x] = Math.sqrt(dx * dx + g[base + r])
    }
  }

  return dist
}
