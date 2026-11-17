import { onMounted, onUnmounted, shallowRef, type InjectionKey, type ShallowRef } from 'vue'

export const systemInsetsKey: InjectionKey<ShallowRef<Record<string, string>>> = Symbol('mobile-system-insets')

function getWindowInfo() {
  return typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()
}

function getSafeTop({ statusBarHeight, safeArea, safeAreaInsets }: ReturnType<typeof getWindowInfo>) {
  return Math.max(statusBarHeight || 0, safeAreaInsets?.top ?? safeArea?.top ?? 0)
}

export function getCapsuleClearance(top = getSafeTop(getWindowInfo())) {
  // #ifdef MP-WEIXIN
  try {
    const capsule = uni.getMenuButtonBoundingClientRect()
    if (capsule.height > 0 && capsule.bottom > top) {
      return capsule.bottom + Math.max(4, capsule.top - top)
    }
  } catch {
    // Some WeChat versions return no menu rectangle during the first render.
  }
  // #endif
  return top + 48
}

function nativeInsets(): Record<string, string> {
  const styles: Record<string, string> = {}
  // #ifdef MP-WEIXIN || APP-PLUS
  const windowInfo = getWindowInfo()
  const { screenHeight, screenWidth, safeArea, safeAreaInsets } = windowInfo
  const top = getSafeTop(windowInfo)
  const bottom = Math.max(0, safeAreaInsets?.bottom ?? (safeArea ? screenHeight - safeArea.bottom : 0))
  const left = Math.max(0, safeAreaInsets?.left ?? safeArea?.left ?? 0)
  const right = Math.max(0, safeAreaInsets?.right ?? (safeArea ? screenWidth - safeArea.right : 0))
  for (const [side, inset] of Object.entries({ top, bottom, left, right })) {
    styles[`--mobile-safe-${side}`] = `max(${inset}px, env(safe-area-inset-${side}, 0px))`
  }
  // #endif

  // #ifdef MP-WEIXIN
  styles['--mobile-capsule-top'] = `${getCapsuleClearance(top)}px`
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
