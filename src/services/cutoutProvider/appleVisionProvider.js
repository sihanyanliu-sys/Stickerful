export const providerName = 'apple-vision'

function getCapacitorPlugin() {
  return window.Capacitor?.Plugins?.AppleVisionCutout || window.Capacitor?.Plugins?.StickerfulVision
}

export function isAvailable() {
  return typeof window !== 'undefined' && !!getCapacitorPlugin()
}

export async function createCutout(imageDataUrl) {
  const plugin = getCapacitorPlugin()
  if (!plugin?.cutout) {
    throw new Error('Apple Vision cutout plugin is not available')
  }

  const result = await plugin.cutout({ image: imageDataUrl })
  const cutout = result?.image || result?.cutout || result?.dataUrl
  if (!cutout) throw new Error('Apple Vision cutout plugin returned no image')
  return cutout
}
