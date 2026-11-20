<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { onHide } from '@dcloudio/uni-app'
// #ifdef H5
import MobileImageViewer from './MobileImageViewer.vue'
// #endif

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const index = ref(-1)
const label = ref('')
const images = shallowRef<string[]>([])
const trigger = shallowRef<HTMLElement | null>(null)
const failed = ref(false)
onHide(() => { index.value = -1 })

function open(urls: readonly string[], title: string, start = 0, event?: Event) {
  if (!urls[start]) return
  failed.value = false
  // #ifdef H5
  if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function') {
    const target = event?.currentTarget ?? document.activeElement
    trigger.value = target instanceof HTMLElement ? target : null
    label.value = title
    images.value = [...urls]
    index.value = start
    return
  }
  // #endif
  uni.previewImage({ current: start, urls: [...urls], fail: () => { failed.value = true } })
}

defineExpose({ open })
</script>

<template>
  <text v-if="failed" class="mobile-image-preview__error" role="alert">图片预览失败，请重新打开。</text>
  <!-- #ifdef H5 -->
  <MobileImageViewer v-model="index" :images="images" :label="label" :trigger="trigger" />
  <!-- #endif -->
</template>

<style scoped>
.mobile-image-preview__error { display: block; color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted))); font-size: .875rem; line-height: 1.45; }
</style>
