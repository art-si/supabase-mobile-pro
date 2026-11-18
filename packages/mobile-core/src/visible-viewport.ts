import { shallowRef, watch } from 'vue'

export function useVisibleViewport(enabled: () => boolean = () => true) {
  const bounds = shallowRef<{ height: number; top: number; bottom: number }>()
  // #ifdef H5
  watch(enabled, (open, _, cleanup) => {
    if (!open || typeof window === 'undefined') return
    const viewport = window.visualViewport
    const update = () => {
      const layoutHeight = document.documentElement.clientHeight || window.innerHeight
      const top = Math.max(0, viewport?.offsetTop ?? 0)
      bounds.value = viewport && viewport.scale === 1 && viewport.height < layoutHeight - 1
        ? { height: Math.floor(viewport.height), top, bottom: Math.max(0, layoutHeight - viewport.height - top) }
        : undefined
    }
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    update()
    cleanup(() => {
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      bounds.value = undefined
    })
  }, { immediate: true })
  // #endif
  return bounds
}
