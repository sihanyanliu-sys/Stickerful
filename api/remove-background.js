import process from 'node:process'
import { createBaiduCutoutMiddleware } from '../server/baiduCutout.js'

const handler = createBaiduCutoutMiddleware({
  apiKey: process.env.BAIDU_CUTOUT_API_KEY,
  secretKey: process.env.BAIDU_CUTOUT_SECRET_KEY,
})

export default function removeBackground(req, res) {
  return handler(req, res, () => {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Not found' }))
  })
}
