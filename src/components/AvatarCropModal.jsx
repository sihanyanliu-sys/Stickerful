import { useState, useRef, useEffect } from 'react'

// ── 头像裁剪浮层 ──
// 用户选完照片后弹出。圆形预览窗口，用户可以拖动平移、用滑块缩放，
// 确认后输出 256×256 jpeg data URL（圆形遮罩在外部渲染时由 rounded-full 完成）。
export default function AvatarCropModal({ src, onCancel, onConfirm }) {
  const CROP_SIZE   = 280     // 圆形预览窗口尺寸
  const OUTPUT_SIZE = 256     // 输出图像边长

  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [scale,   setScale]   = useState(1)
  const [minScale, setMinScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const dragRef = useRef(null)

  // 载入图片，初始化缩放：短边贴满圆形
  useEffect(() => {
    if (!src) return
    const img = new Image()
    img.onload = () => {
      const iw = img.naturalWidth, ih = img.naturalHeight
      setImgSize({ w: iw, h: ih })
      const fit = CROP_SIZE / Math.min(iw, ih)
      setMinScale(fit)
      setScale(fit)
      setTx(0); setTy(0)
    }
    img.src = src
  }, [src])

  function getPoint(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }

  function handleDown(e) {
    e.preventDefault()
    const p = getPoint(e)
    dragRef.current = { startX: p.x, startY: p.y, baseTx: tx, baseTy: ty }
  }

  function handleMove(e) {
    if (!dragRef.current) return
    e.preventDefault()
    const p = getPoint(e)
    const dx = p.x - dragRef.current.startX
    const dy = p.y - dragRef.current.startY
    setTx(dragRef.current.baseTx + dx)
    setTy(dragRef.current.baseTy + dy)
  }

  function handleUp() {
    dragRef.current = null
  }

  // 把窗口里看到的圆形区域裁出来，画到 OUTPUT_SIZE×OUTPUT_SIZE 的 canvas
  function handleConfirm() {
    const { w: iw, h: ih } = imgSize
    if (!iw || !ih) return

    // 图像在窗口里的左上角坐标
    const imgLeft = CROP_SIZE / 2 - iw * scale / 2 + tx
    const imgTop  = CROP_SIZE / 2 - ih * scale / 2 + ty
    // 窗口 (0,0)~(CROP_SIZE,CROP_SIZE) 对应到原图坐标
    const srcLeft = -imgLeft / scale
    const srcTop  = -imgTop  / scale
    const srcSize = CROP_SIZE / scale

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    // 白色背景，防止用户拖出范围时出现透明区域
    ctx.fillStyle = '#FFF0DB'
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, srcLeft, srcTop, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      onConfirm(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = src
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
    >
      <p className="text-white text-[15px] mb-5 opacity-80">拖动 · 滑动条缩放</p>

      {/* Crop window */}
      <div
        style={{
          width: CROP_SIZE, height: CROP_SIZE,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '50%',
          boxShadow: '0 0 0 4px rgba(255,255,255,0.18), 0 20px 60px rgba(0,0,0,0.5)',
          touchAction: 'none',
          cursor: 'grab',
        }}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onTouchStart={handleDown}
        onTouchMove={handleMove}
        onTouchEnd={handleUp}
        onTouchCancel={handleUp}
      >
        {src && imgSize.w > 0 && (
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              width:  imgSize.w * scale,
              height: imgSize.h * scale,
              left: CROP_SIZE / 2 - (imgSize.w * scale) / 2 + tx,
              top:  CROP_SIZE / 2 - (imgSize.h * scale) / 2 + ty,
              userSelect: 'none',
              pointerEvents: 'none',
              maxWidth: 'none',
            }}
          />
        )}
      </div>

      {/* Zoom slider */}
      <div className="w-[280px] mt-6 mb-6 flex items-center gap-3">
        <span className="text-white text-[16px] opacity-70 w-4 text-center">−</span>
        <input
          type="range"
          min={minScale}
          max={minScale * 4}
          step={0.001}
          value={scale}
          onChange={e => setScale(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: '#FF9500' }}
        />
        <span className="text-white text-[16px] opacity-70 w-4 text-center">+</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="px-8 py-3 rounded-[12px] font-semibold text-[15px] active:opacity-70"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
        >
          取消
        </button>
        <button
          onClick={handleConfirm}
          className="px-8 py-3 rounded-[12px] font-semibold text-[15px] active:opacity-70"
          style={{ background: '#FF9500', color: '#fff' }}
        >
          确认
        </button>
      </div>
    </div>
  )
}
