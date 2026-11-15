import type { App } from 'vue'
import { createPinia } from 'pinia'

export function installMobilePlugins(app: App) {
  app.use(createPinia())
}
