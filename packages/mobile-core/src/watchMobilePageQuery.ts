// #ifdef H5
import { getCurrentInstance, watch } from 'vue'
// #endif

export function watchMobilePageQuery(path: string, onChange: (query: Record<string, unknown>) => void) {
  // #ifdef H5
  const instance = getCurrentInstance()
  if (!instance) return
  const globals = instance.appContext.config.globalProperties
  watch(() => {
    // Uni H5 reuses the page instance for URL query changes without calling onLoad.
    const route = globals.$route as { path: string; query: Record<string, unknown> } | undefined
    return route?.path === path ? route.query : undefined
  }, (query, previous) => {
    if (!query || !previous) return
    const pages = getCurrentPages()
    if (Object.is(pages[pages.length - 1], instance.proxy)) onChange(query)
  }, { flush: 'post' })
  // #endif
}
