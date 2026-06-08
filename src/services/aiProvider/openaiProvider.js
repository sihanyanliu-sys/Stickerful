import { buildFoodPrompt } from './providerConfig'
import { parseFoodResult } from './parseFoodResult'

const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'

export async function recognizeFoodImage(dataUrl, note = '') {
  if (!OPENAI_KEY) throw new Error('缺少 VITE_OPENAI_KEY')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
          { type: 'text', text: buildFoodPrompt(note) },
        ],
      }],
    }),
  })

  if (!res.ok) throw new Error(`OpenAI API ${res.status}`)
  const data = await res.json()
  return parseFoodResult(data.choices?.[0]?.message?.content || '')
}
