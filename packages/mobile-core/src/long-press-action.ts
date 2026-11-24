import { inject, provide, onScopeDispose, watch, type InjectionKey, type Ref } from 'vue'

const actionGuard: InjectionKey<() => boolean> = Symbol('mobile-long-press-action')
/** Descendant actions can synchronously respect a card's long-press state, including native MP taps. */
export function useLongPressActionGuard() { return inject(actionGuard, () => true) }

/** Pair a native longpress/context menu with a visible action, without also activating its card. */
export function useLongPressAction(
  action: () => void,
  enabled: () => boolean,
  target?: Readonly<Ref<unknown>>
) {
  const inherited = useLongPressActionGuard()
  let held = false, blockedUntil = 0
  let stopReleaseClick = () => {}
  function captureReleaseClick() {
    // #ifdef H5
    if (typeof document === 'undefined') return
    stopReleaseClick()
    const click = (event: Event) => {
      if (!allowClick()) { event.preventDefault(); event.stopImmediatePropagation() }
      stopReleaseClick()
    }
    const fresh = () => {
      if (held) return
      reset()
      stopReleaseClick()
    }
    // Opening a modal retargets a compatibility click to its mask/button, outside the card.
    document.addEventListener('click', click, true)
    document.addEventListener('pointerdown', fresh, true)
    document.addEventListener('touchstart', fresh, true)
    document.addEventListener('keydown', fresh, true)
    stopReleaseClick = () => {
      document.removeEventListener('click', click, true)
      document.removeEventListener('pointerdown', fresh, true)
      document.removeEventListener('touchstart', fresh, true)
      document.removeEventListener('keydown', fresh, true)
    }
    // #endif
  }
  function hold(event?: { target?: unknown }) {
    // #ifdef H5
    if ((event?.target as Element | undefined)?.closest?.('[role="dialog"], [data-longpress-ignore]')) return
    // #endif
    if (!enabled() || !inherited()) return
    held = true
    captureReleaseClick()
    action()
  }
  function release() {
    if (!held) return
    held = false
    blockedUntil = Date.now() + 500
  }
  function allowClick() { return inherited() && !held && Date.now() >= blockedUntil }
  provide(actionGuard, allowClick)
  function reset() { held = false; blockedUntil = 0 }
  let detach = () => {}
  // #ifdef H5
  if (target) watch(target, value => {
    detach()
    const node = value && typeof value === 'object' && '$el' in value ? value.$el : value
    if (!node || typeof (node as HTMLElement).addEventListener !== 'function') return
    const root = node as HTMLElement
    const ignored = (event: Event) => (event.target as Element | null)?.closest?.('[role="dialog"], [data-longpress-ignore]')
    const click = (event: Event) => {
      if (ignored(event) || allowClick()) return
      event.preventDefault(); event.stopImmediatePropagation()
    }
    const context = (event: Event) => {
      if (ignored(event) || !enabled()) return
      event.preventDefault(); event.stopImmediatePropagation()
      const touching = held
      hold()
      if (!touching) release()
    }
    root.addEventListener('click', click, true)
    root.addEventListener('contextmenu', context, true)
    detach = () => {
      root.removeEventListener('click', click, true)
      root.removeEventListener('contextmenu', context, true)
    }
  }, { immediate: true, flush: 'post' })
  // #endif
  onScopeDispose(() => { detach(); stopReleaseClick(); reset() })
  return { hold, release, allowClick, reset }
}
