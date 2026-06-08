function stripCodeFence(text) {
  return String(text || '')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
}

export function parseFoodResult(content) {
  const raw = stripCodeFence(content)
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  const jsonText = start >= 0 && end > start ? raw.slice(start, end + 1) : raw
  const data = JSON.parse(jsonText)

  return {
    name: String(data.name || '').trim(),
    description: String(data.description || '').trim(),
    calories: Number(data.calories) || 0,
    carbs: Number(data.carbs) || 0,
    protein: Number(data.protein) || 0,
    fat: Number(data.fat) || 0,
  }
}
