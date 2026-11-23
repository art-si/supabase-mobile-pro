import { onScopeDispose } from 'vue'
import { onHide, onPullDownRefresh, onShow } from '@dcloudio/uni-app'

/** Use with pages.json enablePullDownRefresh; loaders own their data/error state. */
export function usePullDownRefresh(
  refresh: () => unknown | Promise<unknown>,
  enabled: () => boolean = () => true
) {
  let visible = true, disposed = false, generation = 0
  let pending: Promise<void> | undefined
  const stop = () => { uni.stopPullDownRefresh() }
  function run(): Promise<void> {
    if (disposed || !visible) return Promise.resolve()
    if (pending) return pending
    if (!enabled()) { stop(); return Promise.resolve() }
    const current = generation
    const task = Promise.resolve().then(refresh).then(() => {}).finally(() => {
      if (pending === task) pending = undefined
      // An old route must not stop the next page's refresh indicator.
      if (!disposed && visible && current === generation) stop()
    })
    pending = task
    return task
  }
  function hide() {
    if (visible) stop()
    visible = false; generation++; pending = undefined
  }
  onPullDownRefresh(() => { void run().catch(() => {}) })
  onHide(hide)
  onShow(() => { if (!disposed) visible = true })
  onScopeDispose(() => { hide(); disposed = true })
  return { refresh: run }
}
