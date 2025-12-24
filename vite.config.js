import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl() // Genera certificados SSL automáticamente
  ],
  server: {
    https: true, // Habilita HTTPS
    host: true, // Permite acceso desde otros dispositivos en la red
  },
})
