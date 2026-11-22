import { onActivated, onBeforeUnmount, onDeactivated, watch } from 'vue'

let locks = 0
let restore: (() => void) | undefined

export function useOverlayScrollLock(shouldLock: () => boolean) {
  let held = false
  let active = true
  function update(requested: boolean) {
    if (typeof document === 'undefined' || requested === held) return
    held = requested
    locks += requested ? 1 : -1
    if (requested && locks === 1) {
      const root = document.documentElement
      const { style } = document.body
      const gap = window.innerWidth - root.clientWidth
      const overflow = style.overflow
      const padding = style.paddingInlineEnd
      if (gap > 0) {
        style.paddingInlineEnd = (parseFloat(getComputedStyle(document.body).paddingInlineEnd) + gap) + 'px'
        root.style.setProperty('--mobile-overlay-scroll-gap', gap + 'px')
      }
      style.overflow = 'hidden'
      restore = () => {
        style.overflow = overflow
        if (gap > 0) {
          style.paddingInlineEnd = padding
          root.style.removeProperty('--mobile-overlay-scroll-gap')
        }
      }
    } else if (locks === 0) {
      restore?.()
      restore = undefined
    }
  }
  watch(shouldLock, value => update(active && value), { immediate: true, flush: 'sync' })
  onActivated(() => { active = true; update(shouldLock()) })
  onDeactivated(() => { active = false; update(false) })
  onBeforeUnmount(() => update(false))
}
