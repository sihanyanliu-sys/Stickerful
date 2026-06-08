import { removeBackground } from '../../utils/removeBackground'

export const providerName = 'web'

export function isAvailable() {
  return typeof document !== 'undefined' && typeof fetch !== 'undefined'
}

export async function createCutout(imageDataUrl) {
  return removeBackground(imageDataUrl)
}
