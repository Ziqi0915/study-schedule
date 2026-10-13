import { defineConfig } from 'vite'

// changeOrigin must stay false: the API compares Origin with the forwarded Host to block cross-site requests.
const proxy = { '/api': { target: `http://127.0.0.1:${process.env.API_PORT || 3001}`, changeOrigin: false } }

export default defineConfig({
  server: { proxy },
  preview: { proxy },
})
