import { AI_PROVIDER } from './providerConfig'
import * as openaiProvider from './openaiProvider'
import * as qwenProvider from './qwenProvider'

const PROVIDERS = {
  openai: openaiProvider,
  qwen: qwenProvider,
}

function getProvider() {
  return PROVIDERS[AI_PROVIDER] || openaiProvider
}

export function recognizeFoodImage(dataUrl, note) {
  return getProvider().recognizeFoodImage(dataUrl, note)
}

export { AI_PROVIDER }
