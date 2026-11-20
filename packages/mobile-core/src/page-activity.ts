import { onScopeDispose, ref, watch, type Ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'

/** Run page work only while both the current route and the app are visible. */
export function usePageActivity(
  foreground: Readonly<Ref<boolean>>,
  start: () => void,
  stop: () => void
) {
  const shown = ref(false)
  let active = false,
    disposed = false
  const unwatch = watch(
    [shown, foreground],
    ([pageVisible, appVisible]) => {
      const next = !disposed && pageVisible && appVisible
      if (next === active) return
      active = next
      if (next) start()
      else stop()
    },
    { flush: 'sync' }
  )
  function dispose() {
    if (disposed) return
    disposed = true
    unwatch()
    if (active) stop()
    active = false
  }
  onShow(() => {
    if (!disposed) shown.value = true
  })
  onHide(() => {
    shown.value = false
  })
  onUnload(dispose)
  onScopeDispose(dispose)
}
