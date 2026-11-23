import { onScopeDispose, watch, type Ref } from 'vue'

/** Pair a native longpress/context menu with a visible action, without also activating its card. */
export function useLongPressAction(
  action: () => void,
  enabled: () => boolean,
  target?: Readonly<Ref<unknown>>
) {
  let held = false, blockedUntil = 0
  function hold() {
    if (!enabled()) return
    held = true
    action()
  }
  function release() {
    if (!held) return
    held = false
    blockedUntil = Date.now() + 500
  }
  function allowClick() { return !held && Date.now() >= blockedUntil }
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
  onScopeDispose(() => { detach(); reset() })
  return { hold, release, allowClick, reset }
}
