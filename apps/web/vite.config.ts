import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'OpenHR',
        short_name: 'OpenHR',
        description: 'Datensparsame Personalverwaltung',
        lang: 'de',
        display: 'standalone',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
      },
    }),
  ],
})
