import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  build: {
    target: 'es2022',
  },
  plugins: [react()],
  server: {
    proxy: {
      '/submit': {
        target: 'https://api.mcteamster.com/white/submit',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/submit/, '')
      },
    },
  },
})
