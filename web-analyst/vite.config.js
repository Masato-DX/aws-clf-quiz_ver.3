import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base を './' にすることで、GitHub Pages のサブパス配信
// （例: https://<user>.github.io/web-analyst-quiz/）でも
// ルート配信でも、そのまま動作する。
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})
