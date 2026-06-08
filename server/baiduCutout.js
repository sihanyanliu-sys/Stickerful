import { Buffer } from 'node:buffer'

const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token'
const CUTOUT_URL = 'https://aip.baidubce.com/rest/2.0/image-process/v1/segment'
const MAX_BODY_BYTES = 12 * 1024 * 1024

let tokenCache = null

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') return JSON.parse(req.body)
    return req.body
  }

  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('图片太大，请换一张较小的图片')
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function stripDataUrl(image) {
  return String(image || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

async function getAccessToken({ apiKey, secretKey }) {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.token

  const url = new URL(TOKEN_URL)
  url.searchParams.set('grant_type', 'client_credentials')
  url.searchParams.set('client_id', apiKey)
  url.searchParams.set('client_secret', secretKey)

  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || '获取百度 access_token 失败')
  }

  tokenCache = {
    token: data.access_token,
    expiresAt: now + Number(data.expires_in || 0) * 1000,
  }
  return tokenCache.token
}

function pickForeground(data) {
  return data?.foreground ||
    data?.result?.foreground ||
    data?.image ||
    data?.result?.image ||
    data?.cutout ||
    data?.dataUrl ||
    null
}

export function createBaiduCutoutMiddleware({ apiKey, secretKey } = {}) {
  return async function baiduCutoutMiddleware(req, res, next) {
    if (req.method !== 'POST' || req.url?.split('?')[0] !== '/api/remove-background') {
      next()
      return
    }

    if (!apiKey || !secretKey) {
      sendJson(res, 500, { error: '缺少 BAIDU_CUTOUT_API_KEY / BAIDU_CUTOUT_SECRET_KEY' })
      return
    }

    try {
      const { image } = await readJsonBody(req)
      const imageBase64 = stripDataUrl(image)
      if (!imageBase64) throw new Error('缺少图片数据')

      const accessToken = await getAccessToken({ apiKey, secretKey })
      const params = new URLSearchParams()
      params.set('image', imageBase64)
      params.set('method', 'auto')
      params.set('refine_mask', 'true')
      params.set('return_form', 'rgba')

      const cutoutResponse = await fetch(`${CUTOUT_URL}?access_token=${encodeURIComponent(accessToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      })
      const cutoutData = await cutoutResponse.json()
      const foreground = pickForeground(cutoutData)

      if (!cutoutResponse.ok || cutoutData.error_code || !foreground) {
        throw new Error(cutoutData.error_msg || cutoutData.error || '百度智能抠图失败')
      }

      const imageDataUrl = String(foreground).startsWith('data:')
        ? foreground
        : `data:image/png;base64,${foreground}`
      sendJson(res, 200, { image: imageDataUrl, provider: 'baidu' })
    } catch (error) {
      sendJson(res, 502, { error: error.message || '百度智能抠图失败' })
    }
  }
}
