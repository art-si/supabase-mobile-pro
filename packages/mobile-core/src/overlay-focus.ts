import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'
import { elementOf, tabStops, type ElementTarget } from './form-focus'

type Options = {
  panel: () => ElementTarget
  cancel: () => void
  initial?: string
  trigger?: () => HTMLElement | null
}

// #ifdef H5
type Layer = { panel: () => HTMLElement | undefined; visible: Readonly<Ref<boolean>> }
const layers: Layer[] = []
const topLayer = () => layers[layers.length - 1]
// #endif

/** Apply one keyboard scope to each Wot overlay, including overlays opened inside a sheet. */
export function useOverlayFocus(visible: Readonly<Ref<boolean>>, options: Options) {
  // #ifdef H5
  let trigger: HTMLElement | null = null
  let openedIn: Layer | undefined
  let frame: number | undefined

  function getPanel() {
    return elementOf(options.panel())
  }

  const layer = { panel: getPanel, visible }

  function handleKeydown(event: KeyboardEvent) {
    if (topLayer() !== layer || event.isComposing) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopImmediatePropagation()
      options.cancel()
    } else if (event.key === 'Tab') {
      const panel = getPanel()
      const controls = panel ? tabStops(panel) : []
      const first = controls[0]
      const last = controls[controls.length - 1]
      const current = document.activeElement
      if (controls.some((element) => element === current) && current !== (event.shiftKey ? first : last)) return
      event.preventDefault()
      const next = (event.shiftKey ? last : first) ?? panel
      next?.focus()
    }
  }

  function focusPanel(attempts = 20) {
    frame = undefined
    if (!visible.value || topLayer() !== layer) return
    const panel = getPanel()
    if (panel?.getClientRects().length) {
      const controls = tabStops(panel)
      const { initial } = options
      const preferred = initial && controls.find((item) => item.matches(initial))
      const target = preferred || controls[0] || panel
      target.focus()
      if (document.activeElement === target) return
    }
    // Lazy Wot content appears after the model changes, even without transitionend.
    if (attempts > 0) frame = requestAnimationFrame(() => focusPanel(attempts - 1))
  }

  function stop() {
    if (typeof document === 'undefined') return
    const index = layers.indexOf(layer)
    if (index >= 0) layers.splice(index, 1)
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    document.removeEventListener('keydown', handleKeydown, true)
  }

  watch(visible, (open, _, onCleanup) => {
    if (typeof document === 'undefined') return
    if (!open) {
      stop()
      if (!trigger) return
      // Reversing a Wot transition can skip after-leave; the model owns focus.
      let pending = true
      onCleanup(() => { pending = false })
      void nextTick(() => {
        if (!pending || visible.value) return
        const target = trigger
        trigger = null
        const outer = openedIn
        openedIn = undefined
        const top = topLayer()
        if (!target?.isConnected || (outer && !outer.visible.value) || (top && !top.panel()?.contains(target))) return
        target.focus({ preventScroll: true })
      })
      return
    }
    const active = document.activeElement
    if (active instanceof HTMLElement && active !== document.body && !getPanel()?.contains(active)) trigger = active
    trigger = options.trigger?.() ?? trigger
    openedIn = topLayer()
    layers.push(layer)
    document.addEventListener('keydown', handleKeydown, true)
    focusPanel()
  }, { immediate: true })
  onBeforeUnmount(stop)
  // #endif
}
