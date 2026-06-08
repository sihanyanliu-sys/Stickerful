import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createBaiduCutoutMiddleware } from './server/baiduCutout.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const baiduApiKey = env.BAIDU_CUTOUT_API_KEY || env.VITE_BAIDU_CUTOUT_API_KEY
  const baiduSecretKey = env.BAIDU_CUTOUT_SECRET_KEY || env.VITE_BAIDU_CUTOUT_SECRET_KEY

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'stickerful-baidu-cutout-api',
        configureServer(server) {
          server.middlewares.use(createBaiduCutoutMiddleware({
            apiKey: baiduApiKey,
            secretKey: baiduSecretKey,
          }))
        },
      },
    ],
  }
})
