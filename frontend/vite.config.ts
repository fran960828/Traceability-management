import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom', // Esto emula el DOM y el localStorage
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
