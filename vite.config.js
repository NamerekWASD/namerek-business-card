import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    host: true,
    allowedHosts: true,
  },
})
