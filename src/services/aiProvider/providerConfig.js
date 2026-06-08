export const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'openai'

export const FOOD_RECOGNITION_SCHEMA = `{
  "name": "食物/饮料名称（中文，简洁）",
  "description": "一句话简短描述口味或特点（15字以内）",
  "calories": 整数（kcal，估算单份/单杯）,
  "carbs": 整数（克）,
  "protein": 整数（克）,
  "fat": 整数（克）
}`

export function buildFoodPrompt(note = '') {
  const noteHint = note ? `\n用户备注（参考此信息提高精度）：${note}` : ''
  return `分析这张食物或饮料图片，只返回如下JSON，不要任何其他文字：
${FOOD_RECOGNITION_SCHEMA}${noteHint}`
}
