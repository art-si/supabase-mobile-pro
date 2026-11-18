<script lang="ts">
import type { InjectionKey, Ref } from 'vue'

const sheetVisibilityKey: InjectionKey<Readonly<Ref<boolean>>> = Symbol('mobile-sheet-visibility')
</script>

<script setup lang="ts">
import { computed, inject, provide, ref, watch } from 'vue'
import MobileIcon from './MobileIcon.vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import { useOverlayFocus } from '../overlay-focus'
import { systemInsetsKey, useSystemInsets } from '../system-insets'
import { useVisibleViewport } from '../visible-viewport'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const visible = defineModel<boolean>({ required: true })
const props = withDefaults(defineProps<{
  title: string
  closeLabel: string
  busy?: boolean
  tall?: boolean
  initialFocus?: string
  triggerId?: string
  dialogId?: string
  rootPortal?: boolean
  zIndex?: number
  bodyHeight?: number
  keyboardHeight?: number
}>(), { zIndex: 10 })
const emit = defineEmits<{ 'after-enter': [] }>()
const panel = ref<HTMLElement | { $el?: unknown }>()
const systemInsets = inject(systemInsetsKey, useSystemInsets, true)
const parentSheet = inject(sheetVisibilityKey, undefined)
provide(sheetVisibilityKey, visible)
const lockScroll = computed(() => {
  // #ifdef H5
  return !parentSheet?.value
  // #endif
  return true
})
const visualBounds = useVisibleViewport(() => visible.value)
const bounds = computed(() => {
  // #ifdef MP-WEIXIN
  if (props.keyboardHeight) {
    const current = uni.getWindowInfo().windowHeight
    const height = Math.max(0, Math.min(current, nativeHeight - props.keyboardHeight))
    return { height, bottom: current - height }
  }
  // #endif
  return visualBounds.value
})
// #ifdef MP-WEIXIN
let nativeHeight = 0
watch(visible, (open) => {
  if (open) nativeHeight = uni.getWindowInfo().windowHeight
}, { immediate: true })
// #endif

const popupStyle = computed(() => {
  const insets = props.rootPortal ? Object.entries(systemInsets.value).map(([key, val]) => `${key}:${val};`).join('') : ''
  const fit = bounds.value
  return `width:100%;max-width:var(--mobile-workspace-max-width,560px);margin-inline:auto;border-radius:24px 24px 0 0;overflow:hidden;${insets}`
    + 'padding-bottom:var(--mobile-sheet-safe-bottom,var(--mobile-safe-bottom,env(safe-area-inset-bottom,0px)));'
    + 'background:var(--mobile-workspace-surface,var(--tms-surface,var(--smis-surface,#fff)));'
    + (fit ? `bottom:${fit.bottom}px;--mobile-sheet-viewport-height:${fit.height}px;--mobile-sheet-safe-bottom:0px;` : '')
})
const bodyStyle = computed(() => props.bodyHeight === undefined ? undefined : { height: `${props.bodyHeight}px` })
useOverlayFocus(visible, {
  panel: () => panel.value, initial: props.initialFocus, cancel: close,
  trigger: () => {
    // #ifdef H5
    return props.triggerId ? document.getElementById(props.triggerId) : null
    // #endif
    return null
  }
})

function close() {
  if (!props.busy) visible.value = false
}
</script>

<template>
  <wd-popup
    :model-value="visible"
    position="bottom"
    :root-portal="rootPortal" :z-index="zIndex" :lock-scroll="lockScroll"
    :close-on-click-modal="!busy"
    :custom-style="popupStyle"
    @update:model-value="close" @after-enter="emit('after-enter')"
  >
    <view :id="dialogId" ref="panel" class="mobile-sheet" :class="{ 'mobile-sheet--tall': tall }"
      role="dialog" aria-modal="true" :aria-label="title" :aria-busy="busy || undefined" tabindex="-1"
    >
      <view class="mobile-sheet__header">
        <text class="mobile-sheet__title" role="heading" aria-level="2">{{ title }}</text>
        <button
          class="mobile-action mobile-action--icon mobile-sheet__close"
          role="button" :tabindex="busy ? -1 : 0" :disabled="busy" :aria-label="closeLabel"
          hover-class="mobile-action--pressed"
          @click="close" @keydown="preventActionKey" @keyup="activateActionKey($event, close)"
        ><MobileIcon name="close" size="20px" aria-hidden="true" /></button>
      </view>
      <view v-if="$slots.toolbar" class="mobile-sheet__toolbar"><slot name="toolbar" /></view>
      <scroll-view class="mobile-sheet__body" :style="bodyStyle" scroll-y><slot /></scroll-view>
      <view v-if="$slots.footer" class="mobile-sheet__footer"><slot name="footer" /></view>
      <slot name="overlay" />
    </view>
  </wd-popup>
</template>

<style scoped lang="scss">
.mobile-sheet {
  --mobile-sheet-surface: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface, #fff)));
  --mobile-sheet-line: var(--mobile-workspace-line, var(--tms-line-subtle, var(--smis-line-subtle)));
  display: flex;
  flex-direction: column;
  min-width: 0;
  --mobile-sheet-bottom: var(--mobile-sheet-safe-bottom, var(--mobile-safe-bottom, env(safe-area-inset-bottom, 0px)));
  max-height: calc(var(--mobile-sheet-viewport-height, 100vh) - var(--mobile-sheet-bottom));
  /* #ifdef H5 */
  max-height: calc(var(--mobile-sheet-viewport-height, 100dvh) - var(--mobile-sheet-bottom));
  /* #endif */
  /* #ifdef MP-WEIXIN */
  max-height: min(100vh, calc(var(--mobile-sheet-viewport-height, 100vh) - var(--mobile-capsule-top, calc(var(--mobile-safe-top, 0px) + 48px)) - var(--mobile-sheet-bottom)));
  /* #endif */
  background: var(--mobile-sheet-surface);
}

.mobile-sheet--tall {
  height: min(90vh, 800px);
  height: min(90dvh, 800px);
  background: var(--mobile-workspace-canvas, var(--tms-surface-soft, var(--smis-surface-soft, #f2f3f6)));
}

.mobile-sheet__header, .mobile-sheet__toolbar, .mobile-sheet__footer {
  flex: none;
  padding-left: max(16px, var(--mobile-safe-left, 0px));
  padding-right: max(16px, var(--mobile-safe-right, 0px));
  background: var(--mobile-sheet-surface);
}

.mobile-sheet__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding-block: 8px;
  border-bottom: 1px solid var(--mobile-sheet-line);
}

.mobile-sheet__title {
  color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong)));
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.mobile-sheet__close.mobile-action {
  border-radius: 14px;
  color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted)));
  background: var(--tms-surface-soft, var(--smis-surface-soft, #f2f3f6));
}

.mobile-sheet__body { flex: 0 1 auto; min-height: 0; overscroll-behavior: contain; }
/* #ifdef H5 */
// Bound Uni's percentage-height scroll wrapper to the flex item's available space.
.mobile-sheet__body { display: grid; grid-template-rows: minmax(0, 1fr); }
/* #endif */
.mobile-sheet--tall .mobile-sheet__body { flex: 1; height: 0; }
.mobile-sheet__toolbar { padding-block: 8px; }

.mobile-sheet__footer {
  padding-block: 8px 10px;
  border-top: 1px solid var(--mobile-sheet-line);
}
</style>
