import { buildFoodPrompt } from './providerConfig'
import { parseFoodResult } from './parseFoodResult'

const QWEN_KEY = import.meta.env.VITE_QWEN_API_KEY
const QWEN_MODEL = import.meta.env.VITE_QWEN_MODEL || 'qwen-vl-plus'
const QWEN_BASE_URL = import.meta.env.VITE_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'

export async function recognizeFoodImage(dataUrl, note = '') {
  if (!QWEN_KEY) throw new Error('缺少 VITE_QWEN_API_KEY')

  const res = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${QWEN_KEY}`,
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: buildFoodPrompt(note) },
        ],
      }],
      max_tokens: 200,
    }),
  })

  if (!res.ok) throw new Error(`Qwen API ${res.status}`)
  const data = await res.json()
  return parseFoodResult(data.choices?.[0]?.message?.content || '')
}
