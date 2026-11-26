import { defineConfig } from 'vite'
import { loadMobilePro } from 'supabase-mobile-pro/scripts/consumer.mjs'

export default defineConfig(async () => {
  const { createMobileViteConfig } = await loadMobilePro(import.meta.dirname)
  return createMobileViteConfig(import.meta.dirname)
})
