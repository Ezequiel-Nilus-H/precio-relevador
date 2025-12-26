import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    // Solo configurar HTTPS si los certificados existen (desarrollo local)
    ...(fs.existsSync(path.resolve(__dirname, '.certificates/key.pem')) && 
        fs.existsSync(path.resolve(__dirname, '.certificates/cert.pem')) ? {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, '.certificates/key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, '.certificates/cert.pem')),
      },
    } : {}),
    host: true, // Permite acceso desde otros dispositivos en la red
    proxy: {
      // Proxy para la API - convierte llamadas HTTPS a HTTP internamente
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
