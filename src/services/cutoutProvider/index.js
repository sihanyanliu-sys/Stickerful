import * as appleVisionProvider from './appleVisionProvider'
import * as baiduProvider from './baiduProvider'
import * as webProvider from './webProvider'

const PROVIDERS = [appleVisionProvider, baiduProvider, webProvider]

export function getCutoutProviderStatus() {
  const active = PROVIDERS.find(provider => provider.isAvailable())
  return {
    active: active?.providerName || 'none',
    appleVisionAvailable: appleVisionProvider.isAvailable(),
    baiduAvailable: baiduProvider.isAvailable(),
    webAvailable: webProvider.isAvailable(),
  }
}

export async function createCutout(imageDataUrl, options = {}) {
  const result = await createCutoutDetailed(imageDataUrl, options)
  return result.image
}

export async function createCutoutDetailed(imageDataUrl, options = {}) {
  const preferred = options.preferredProvider || 'auto'
  const ordered = preferred === 'web'
    ? [webProvider]
    : preferred === 'baidu'
      ? [baiduProvider, webProvider]
    : preferred === 'apple-vision'
      ? [appleVisionProvider, baiduProvider, webProvider]
      : PROVIDERS

  let lastError = null
  for (const provider of ordered) {
    if (!provider.isAvailable()) continue
    try {
      const image = await provider.createCutout(imageDataUrl, options)
      const result = { image, provider: provider.providerName }
      if (typeof window !== 'undefined') {
        window.__STICKERFUL_LAST_CUTOUT_PROVIDER__ = result
        if (import.meta.env.DEV) console.info('[Stickerful] cutout provider:', result.provider)
      }
      return result
    } catch (error) {
      lastError = error
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        console.warn(`[Stickerful] ${provider.providerName} cutout failed, trying fallback`, error)
      }
    }
  }

  throw lastError || new Error('没有可用的抠图服务')
}
