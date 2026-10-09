import { defineConfig } from 'vitest/config'

// Slow tests with the playing bot: npm run playtest
export default defineConfig({
  test: {
    include: ['tests/**/*.playtest.ts'],
    environment: 'node',
  },
})
