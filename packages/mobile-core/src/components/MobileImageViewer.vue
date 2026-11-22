<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useOverlayFocus } from '../overlay-focus'
import { useOverlayScrollLock } from '../overlay-scroll'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'

const props = defineProps<{ images: readonly string[]; label: string; trigger: HTMLElement | null }>()
const index = defineModel<number>({ required: true })
const shown = computed(() => index.value >= 0 && index.value < props.images.length)
useOverlayScrollLock(() => shown.value)
const panel = ref<HTMLDialogElement>()
const stage = ref<HTMLElement>()
const failed = ref(false)
const loaded = ref(false)
const zoomed = ref(false)
const attempt = ref(0)
const url = computed(() => props.images[index.value])
let touch: { x: number; y: number } | undefined

function close() { index.value = -1 }

watch(shown, (open) => {
  if (open) panel.value?.showModal()
  else panel.value?.close()
}, { flush: 'post' })

useOverlayFocus(shown, { panel: () => panel.value, cancel: close, trigger: () => props.trigger })
watch([index, url], () => {
  failed.value = false
  loaded.value = false
  zoomed.value = false
  attempt.value++
  stage.value?.scrollTo(0, 0)
})
function step(offset: number) {
  if (props.images.length > 1) index.value = (index.value + offset + props.images.length) % props.images.length
}
function retry() {
  failed.value = false
  attempt.value++
  const retryControl = document.activeElement
  if (panel.value?.contains(retryControl)) stage.value?.focus({ preventScroll: true })
}
function key(event: KeyboardEvent) {
  if (event.isComposing || zoomed.value) return
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  step(event.key === 'ArrowLeft' ? -1 : 1)
}
function start(event: TouchEvent) {
  const finger = event.touches[0]
  touch = !zoomed.value && event.touches.length === 1 && finger ? { x: finger.clientX, y: finger.clientY } : undefined
}
function end(event: TouchEvent) {
  const finger = event.changedTouches[0]
  if (touch && finger) {
    const x = finger.clientX - touch.x
    if (Math.abs(x) > 48 && Math.abs(x) > Math.abs(finger.clientY - touch.y) * 1.4) step(x < 0 ? 1 : -1)
  }
  touch = undefined
}
</script>

<template>
  <dialog ref="panel" class="mobile-image-viewer" :aria-label="`预览${label}`" aria-modal="true"
    @cancel.prevent="close" @keydown="key">
    <template v-if="shown">
      <header class="mobile-image-viewer__bar">
        <div class="mobile-image-viewer__heading">
          <h2>{{ label }}</h2>
          <span class="mobile-image-viewer__count" role="status">{{ index + 1 }} / {{ images.length }}</span>
        </div>
        <MobileAction variant="icon" aria-label="关闭预览" class="mobile-image-viewer__control" @click="close">
          <MobileIcon name="close" size="20px" />
        </MobileAction>
      </header>
      <div ref="stage" tabindex="-1" class="mobile-image-viewer__stage" :class="{ 'mobile-image-viewer__stage--zoomed': zoomed }"
        @touchstart.passive="start" @touchend.passive="end" @touchcancel="touch = undefined">
        <img v-if="!failed" :key="attempt" :src="url" :alt="`第 ${index + 1} 张${label}`"
          :class="{ 'mobile-image-viewer__loaded': loaded }" draggable="false"
          @load="loaded = true" @error="failed = true">
        <div v-if="failed" class="mobile-image-viewer__feedback">
          <span role="alert">图片加载失败</span>
          <MobileAction class="mobile-image-viewer__control mobile-image-viewer__text-action" @click="retry">重试加载</MobileAction>
        </div>
        <span v-else-if="!loaded" class="mobile-image-viewer__feedback" role="status">正在载入…</span>
      </div>
      <footer class="mobile-image-viewer__bar mobile-image-viewer__footer">
        <MobileAction v-if="images.length > 1" variant="icon" class="mobile-image-viewer__control" aria-label="上一张" @click="step(-1)">
          <span class="mobile-image-viewer__previous"><MobileIcon name="chevron" size="20px" /></span>
        </MobileAction>
        <MobileAction class="mobile-image-viewer__control mobile-image-viewer__text-action" :disabled="!loaded || failed"
          @click="zoomed = !zoomed">{{ zoomed ? '恢复原始大小' : '放大图片' }}</MobileAction>
        <MobileAction v-if="images.length > 1" variant="icon" class="mobile-image-viewer__control" aria-label="下一张" @click="step(1)">
          <MobileIcon name="chevron" size="20px" />
        </MobileAction>
      </footer>
    </template>
  </dialog>
</template>

<style scoped lang="scss">
.mobile-image-viewer {
  color: #f7f8fa;
  background: #181b21;
  border: 0;
  padding: 0;
  width: min(100%, 680px);
  height: 100%;
  height: 100dvh;
  max-width: none;
  max-height: none;
  box-sizing: border-box;
  overscroll-behavior: contain;
}
.mobile-image-viewer[open] { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; }
.mobile-image-viewer::backdrop { background: rgb(10 13 18 / 84%); }
.mobile-image-viewer__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: max(10px, env(safe-area-inset-top, 0px)) max(14px, env(safe-area-inset-right, 0px)) 10px max(14px, env(safe-area-inset-left, 0px));
}
.mobile-image-viewer__heading { min-width: 0; display: grid; gap: 2px; overflow-wrap: anywhere; }
.mobile-image-viewer__heading h2 { margin: 0; font-size: max(16px, 1rem); line-height: 1.35; }
.mobile-image-viewer__count { color: #c8cdd5; font-size: max(13px, .8125rem); font-variant-numeric: tabular-nums; }
.mobile-image-viewer__stage { position: relative; min-height: 0; overflow: hidden; display: grid; place-items: center; background: #101217; overscroll-behavior: contain; touch-action: pan-y pinch-zoom; }
.mobile-image-viewer__stage img { display: block; width: 100%; height: 100%; min-width: 0; min-height: 0; object-fit: contain; visibility: hidden; }
.mobile-image-viewer__stage img.mobile-image-viewer__loaded { visibility: visible; }
.mobile-image-viewer__stage--zoomed { display: block; overflow: auto; touch-action: auto; }
.mobile-image-viewer__stage--zoomed img { width: 200%; height: 200%; max-width: none; }
.mobile-image-viewer__footer { justify-content: center; flex-wrap: wrap; padding-top: 10px; padding-bottom: max(10px, env(safe-area-inset-bottom, 0px)); }
.mobile-image-viewer__control.mobile-action {
  --mobile-action-focus-color: #d2e8ff;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  color: #fff;
  background: #292f39;
}
.mobile-image-viewer__control.mobile-action:focus-visible { outline: 2px solid #d2e8ff; outline-offset: 2px; }
.mobile-image-viewer__text-action.mobile-action { display: grid; place-items: center; padding: 8px 14px; text-align: center; font-size: max(14px, .875rem); }
.mobile-image-viewer__previous { display: flex; transform: rotate(180deg); }
.mobile-image-viewer__feedback { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 12px; color: #e1e6ee; font-size: max(14px, .875rem); }
</style>
