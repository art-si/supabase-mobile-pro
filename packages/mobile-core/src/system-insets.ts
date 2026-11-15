import { onMounted, onUnmounted, shallowRef, type InjectionKey, type ShallowRef } from 'vue'

export const systemInsetsKey: InjectionKey<ShallowRef<Record<string, string>>> = Symbol('mobile-system-insets')

function nativeInsets(): Record<string, string> {
  const styles: Record<string, string> = {}
  // #ifdef MP-WEIXIN || APP-PLUS
  const windowInfo = typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()
  const { screenHeight, screenWidth, safeArea, safeAreaInsets } = windowInfo
  const top = Math.max(windowInfo.statusBarHeight || 0, safeAreaInsets?.top ?? safeArea?.top ?? 0)
  const bottom = Math.max(0, safeAreaInsets?.bottom ?? (safeArea ? screenHeight - safeArea.bottom : 0))
  const left = Math.max(0, safeAreaInsets?.left ?? safeArea?.left ?? 0)
  const right = Math.max(0, safeAreaInsets?.right ?? (safeArea ? screenWidth - safeArea.right : 0))
  for (const [side, inset] of Object.entries({ top, bottom, left, right })) {
    styles[`--mobile-safe-${side}`] = `max(${inset}px, env(safe-area-inset-${side}, 0px))`
  }
  // #endif

  // #ifdef MP-WEIXIN
  let capsuleBottom = top + 48
  try {
    const capsule = uni.getMenuButtonBoundingClientRect()
    if (capsule.height > 0 && capsule.bottom > top) {
      capsuleBottom = capsule.bottom + Math.max(4, capsule.top - top)
    }
  } catch {
    // Some WeChat versions return no menu rectangle during the first render.
  }
  styles['--mobile-capsule-top'] = `${capsuleBottom}px`
  // #endif
  return styles
}

export function useSystemInsets() {
  const styles = shallowRef(nativeInsets())
  // #ifdef MP-WEIXIN || APP-PLUS
  const refresh = () => { styles.value = nativeInsets() }
  onMounted(() => {
    refresh()
    uni.onWindowResize?.(refresh)
  })
  onUnmounted(() => { uni.offWindowResize?.(refresh) })
  // #endif
  return styles
}
