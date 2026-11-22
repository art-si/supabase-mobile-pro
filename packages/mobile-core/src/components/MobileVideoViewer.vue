<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onHide } from '@dcloudio/uni-app'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'
import { useOverlayFocus } from '../overlay-focus'
defineOptions({ options: { styleIsolation: 'apply-shared' } })
const props = defineProps<{ src: string; poster?: string; trigger?: HTMLElement | null }>()
const visible = defineModel<boolean>({ required: true })
const panel = ref<HTMLDialogElement>()
const stage = ref<HTMLElement>()
const failed = ref(false), attempt = ref(0)
const id = `mobile-video-viewer-${getCurrentInstance()!.uid}`
const nativeScope = getCurrentInstance()?.proxy
const shown = computed(() => visible.value && !!props.src)
let opened = false
function stop() {
  if (!opened) return
  // #ifdef H5
  panel.value?.querySelector('video')?.pause()
  // #endif
  // #ifndef H5
  uni.createVideoContext(id, nativeScope).pause()
  // #endif
  opened = false
}
function close() { stop(); visible.value = false }
onHide(close)
function retry() {
  // #ifdef H5
  if (stage.value?.contains(document.activeElement)) stage.value.focus({ preventScroll: true })
  // #endif
  failed.value = false
  attempt.value++
}
watch(shown, async (open) => {
  if (!open) { stop(); panel.value?.close?.(); return }
  opened = true
  failed.value = false
  await nextTick()
  // #ifdef H5
  if (shown.value && !panel.value?.open) panel.value?.showModal()
  // #endif
}, { flush: 'pre' })
useOverlayFocus(shown, { panel: () => panel.value, cancel: close, trigger: () => props.trigger || null })
onBeforeUnmount(stop)
</script>
<template>
  <!-- #ifdef H5 -->
  <dialog ref="panel" class="mobile-video-viewer" aria-label="视频预览" aria-modal="true" @cancel.prevent="close">
    <template v-if="shown">
      <header class="mobile-video-viewer__bar"><h2>视频</h2><MobileAction variant="icon" class="mobile-video-viewer__close" aria-label="关闭视频预览" @click="close"><MobileIcon name="close" size="22px" /></MobileAction></header>
      <div ref="stage" class="mobile-video-viewer__stage" tabindex="-1">
        <video v-if="!failed" :id="id" :key="attempt" :src="src" :poster="poster" class="mobile-video-viewer__player" controls autoplay playsinline :show-fullscreen-btn="false" object-fit="contain" @error="failed = true" />
        <div v-else class="mobile-video-viewer__error"><span role="alert">视频暂时无法播放</span><MobileAction class="mobile-video-viewer__retry" @click="retry">重新播放</MobileAction></div>
      </div>
    </template>
  </dialog>
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <view v-if="shown" class="mobile-video-viewer mobile-video-viewer--native" role="dialog" aria-label="视频预览" aria-modal="true">
    <view class="mobile-video-viewer__bar"><text>视频</text><MobileAction variant="icon" class="mobile-video-viewer__close" aria-label="关闭视频预览" @click="close"><MobileIcon name="close" size="22px" /></MobileAction></view>
    <view class="mobile-video-viewer__stage">
      <video v-if="!failed" :id="id" :key="attempt" :src="src" :poster="poster" class="mobile-video-viewer__player" controls autoplay :show-fullscreen-btn="false" object-fit="contain" @error="failed = true" />
      <view v-else class="mobile-video-viewer__error"><text role="alert">视频暂时无法播放</text><MobileAction class="mobile-video-viewer__retry" @click="retry">重新播放</MobileAction></view>
    </view>
  </view>
  <!-- #endif -->
</template>
<style scoped>
/* #ifdef H5 */
:global(html:has(.mobile-video-viewer[open])), :global(body:has(.mobile-video-viewer[open])) { overflow: hidden; }
/* #endif */
.mobile-video-viewer { color: #f7f8fa; background: #181b21; border: 0; padding: 0; width: min(100%, 680px); height: 100vh; height: 100dvh; max-width: none; max-height: none; box-sizing: border-box; overscroll-behavior: contain; }
.mobile-video-viewer[open], .mobile-video-viewer--native { display: grid; grid-template-rows: auto minmax(0, 1fr); }
.mobile-video-viewer--native { position: fixed; inset: 0; width: 100%; z-index: 500; }
.mobile-video-viewer::backdrop { background: rgb(10 13 18 / 84%); }
.mobile-video-viewer__bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: max(10px, env(safe-area-inset-top, 0px)) max(14px, env(safe-area-inset-right, 0px)) 10px max(14px, env(safe-area-inset-left, 0px)); }
.mobile-video-viewer__bar h2 { margin: 0; font-size: max(16px, 1rem); font-weight: 600; }
.mobile-video-viewer__close.mobile-action, .mobile-video-viewer__retry.mobile-action { display: grid; place-items: center; min-width: 48px; min-height: 48px; color: #fff; background: #292f39; border-radius: 12px; }
.mobile-video-viewer__close.mobile-action:focus-visible { outline: 2px solid #d2e8ff; outline-offset: 2px; }
.mobile-video-viewer__stage { min-height: 0; display: grid; place-items: center; background: #101217; }
.mobile-video-viewer--native .mobile-video-viewer__bar { padding-top: max(10px, var(--mobile-capsule-top, var(--mobile-safe-top, 0px))); }
.mobile-video-viewer--native .mobile-video-viewer__stage { box-sizing: border-box; padding-bottom: var(--mobile-safe-bottom, 0px); }
.mobile-video-viewer__player { display: block; width: 100%; height: 100%; min-height: 0; object-fit: contain; }
.mobile-video-viewer__error { display: grid; gap: 16px; justify-items: center; padding: 24px; font-size: 1rem; }
.mobile-video-viewer__retry { padding: 10px 16px; }
</style>
