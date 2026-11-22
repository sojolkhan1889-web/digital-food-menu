import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mediaUploadPlugin } from './vite-plugin-media-upload.js'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mediaUploadPlugin(),
  ],
})

