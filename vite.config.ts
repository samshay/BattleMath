import { defineConfig } from 'vitest/config'
export default defineConfig({
  base: '/BattleMath/',
  test: { include: ['tests/**/*.test.ts'] },
})
