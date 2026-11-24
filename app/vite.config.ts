import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendProxy = {
    target: env.VITE_SERVER_URL || 'http://localhost:8000',
    changeOrigin: true,
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': backendProxy,
        '/health': backendProxy,
      },
    },
  }
})
