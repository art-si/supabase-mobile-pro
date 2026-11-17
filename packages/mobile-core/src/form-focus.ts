import { nextTick, ref, watchPostEffect, type ComponentPublicInstance } from 'vue'
// #ifdef MP-WEIXIN
import { getCapsuleClearance } from './system-insets'
// #endif

export type ElementTarget = HTMLElement | { $el?: unknown } | null | undefined

export function elementOf(target: ElementTarget) {
  if (typeof HTMLElement === 'undefined') return undefined
  if (target instanceof HTMLElement) return target
  return target?.$el instanceof HTMLElement ? target.$el : undefined
}

export function nativeFieldOf(target: ElementTarget) {
  const element = elementOf(target)
  if (!element) return undefined
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return element
  return element.querySelector<HTMLInputElement | HTMLTextAreaElement>('input,textarea')
}

const controlSelector = 'button,input,select,textarea,a[href],[tabindex],[contenteditable="true"]'

export function tabStops(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(controlSelector)).filter((element) =>
    element.tabIndex >= 0 &&
    !element.matches(':disabled,[type="hidden"],[aria-disabled="true"]') &&
    !element.closest('[inert],[aria-hidden="true"]') &&
    element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible'
  )
}

/** Uni-app exposes some input attributes on its wrapper instead of the editable element. */
export function useNativeFieldAttributes(read: () => Record<string, string | undefined>) {
  const control = ref<ElementTarget>()
  // #ifdef H5
  watchPostEffect(() => {
    const attributes = read()
    const input = nativeFieldOf(control.value)
    if (!input) return
    for (const [name, value] of Object.entries(attributes)) {
      if (value === undefined) input.removeAttribute(name)
      else input.setAttribute(name, value)
    }
  })
  // #endif
  return control
}

export async function revealControl(id: string, options: { focus?: boolean; nativeScope?: ComponentPublicInstance | null } = {}) {
  const { focus = true, nativeScope } = options
  await nextTick()
  // #ifdef H5
  const field = document.getElementById(id)
  if (!field) return
  field.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
  if (focus) {
    const target = field.matches(controlSelector) && !field.matches(':disabled,[aria-disabled="true"]')
      ? field
      : tabStops(field)[0]
    target?.focus({ preventScroll: true })
  }
  // #endif
  // #ifdef MP-WEIXIN
  const offset = getCapsuleClearance() + 12
  if (nativeScope) {
    const query = uni.createSelectorQuery().in(nativeScope)
    query.select(`#${id}`).boundingClientRect()
    query.selectViewport().scrollOffset(() => {})
    query.exec(([target, viewport]: [UniApp.NodeInfo | null, UniApp.NodeInfo | null]) => {
      if (typeof target?.top === 'number' && typeof viewport?.scrollTop === 'number') {
        uni.pageScrollTo({ scrollTop: Math.max(0, viewport.scrollTop + target.top - offset), duration: 0 })
      }
    })
    return
  }
  uni.pageScrollTo({ selector: `#${id}`, duration: 0, offsetTop: -offset })
  // #endif
  // #ifndef H5 || MP-WEIXIN
  uni.pageScrollTo({ selector: `#${id}`, duration: 0 })
  // #endif
}
