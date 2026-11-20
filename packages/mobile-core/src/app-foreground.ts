export interface NativeAppStateSource {
  addListener(
    event: 'appStateChange',
    listener: (state: { isActive: boolean }) => void
  ): Promise<{ remove(): Promise<void> }>
  getState(): Promise<{ isActive: boolean }>
}

/** Combine framework visibility with native activity; neither can override an inactive peer. */
export function createAppForeground(
  onChange: (foreground: boolean) => void,
  options: {
    native?: NativeAppStateSource
    initializationTimeoutMs?: number
  } = {}
) {
  let visible = false,
    nativeActive = !options.native,
    foreground = false,
    disposed = false,
    revision = 0
  let handle: { remove(): Promise<void> } | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  function publish() {
    if (disposed) return
    const next = visible && nativeActive
    if (next === foreground) return
    foreground = next
    onChange(next)
  }
  function nativeChanged(state: { isActive: boolean }) {
    if (disposed || typeof state?.isActive !== 'boolean') return
    revision++
    clearTimeout(timeout)
    nativeActive = state.isActive
    publish()
  }
  function fallback() {
    // A missing/broken bridge must not freeze a usable browser. Once a native event is known,
    // failures cannot erase it. A timed-out initial snapshot is also no longer authoritative.
    if (disposed || revision) return
    revision++
    clearTimeout(timeout)
    nativeActive = true
    publish()
  }
  async function remove(listener: { remove(): Promise<void> }) {
    try {
      await listener.remove()
    } catch {
      // No provider error payloads or broad removeAllListeners: other app listeners are unrelated.
    }
  }
  if (options.native) {
    const native = options.native
    timeout = setTimeout(fallback, options.initializationTimeoutMs ?? 2000)
    void (async () => {
      try {
        const listener = await native.addListener('appStateChange', nativeChanged)
        if (disposed) {
          await remove(listener)
          return
        }
        handle = listener
        // Subscribe first, then obtain a snapshot. Events always beat an older async snapshot.
        if (revision) return
        const before = revision
        const state = await native.getState()
        if (disposed || revision !== before) return
        if (typeof state?.isActive === 'boolean') nativeChanged(state)
        else fallback()
      } catch {
        fallback()
      }
    })()
  }
  return {
    setVisible(value: boolean) {
      if (disposed) return
      visible = value
      publish()
    },
    dispose() {
      if (disposed) return
      visible = false
      publish()
      disposed = true
      revision++
      clearTimeout(timeout)
      if (handle) void remove(handle)
      handle = undefined
    }
  }
}
