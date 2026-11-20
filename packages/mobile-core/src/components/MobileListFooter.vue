<script setup lang="ts">
// #ifdef H5
import { onBeforeUnmount, ref, watch } from 'vue'
// #endif
import MobileAction from './MobileAction.vue'
import MobileLoadError from './MobileLoadError.vue'
import MobileLoadingStatus from './MobileLoadingStatus.vue'

defineOptions({ options: { styleIsolation: 'apply-shared' } })

const props = defineProps<{
  loading?: boolean
  finished?: boolean
  count?: number
  total?: number
  canLoadMore?: boolean
  error?: string
  errorTitle?: string
  retryText?: string
}>()
defineEmits<{ more: [] }>()

// #ifdef H5
const container = ref<HTMLElement>()
let keyboardRequest: AbortController | undefined

function stopRestoringFocus() {
  keyboardRequest?.abort()
  keyboardRequest = undefined
}

watch([() => props.loading, () => props.error], ([loading, error]) => {
  if (loading || !keyboardRequest) return
  stopRestoringFocus()
  if (!error || !document.hasFocus() || document.activeElement !== document.body) return
  const retry = container.value?.querySelector<HTMLElement>('.mobile-load-error__retry')
  retry?.focus({ preventScroll: true })
  retry?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}, { flush: 'post' })

onBeforeUnmount(stopRestoringFocus)

function rememberKeyboardRequest(event: KeyboardEvent) {
  if ((event.key !== 'Enter' && event.key !== ' ') || event.target !== document.activeElement) return
  stopRestoringFocus()
  keyboardRequest = new AbortController()
  const options = { capture: true, signal: keyboardRequest.signal }
  document.addEventListener('focusin', stopRestoringFocus, options)
  document.addEventListener('pointerdown', stopRestoringFocus, options)
}
// #endif
</script>

<template>
  <!-- #ifdef H5 -->
  <div v-if="error || loading || canLoadMore || (finished && count)" ref="container" @keyup.capture="rememberKeyboardRequest">
  <!-- #endif -->
    <MobileLoadError v-if="error && !loading" inline :message="error" :title="errorTitle" :retry-text="retryText" @retry="$emit('more')" />
    <view v-else-if="loading || canLoadMore || (finished && count)" class="mobile-list-footer">
      <slot v-if="loading" name="loading">
        <MobileLoadingStatus label="正在加载更多…" />
      </slot>
      <view v-else-if="finished && count" class="mobile-inline-pair" role="status">
        <view class="mobile-list-footer__line" aria-hidden="true" />
        <text>{{ total !== undefined && count < total ? '已加载' : '已加载全部' }} {{ count }} 条</text>
        <view class="mobile-list-footer__line" aria-hidden="true" />
      </view>
      <MobileAction v-else variant="link" @click="$emit('more')">加载更多</MobileAction>
    </view>
  <!-- #ifdef H5 -->
  </div>
  <!-- #endif -->
</template>

<style scoped lang="scss">
.mobile-list-footer {
  --mobile-loading-gap: 8px;
  --mobile-loading-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--tms-control-height, var(--smis-control-height, 44px));
  color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-text-muted)));
  font-size: max(13px, .8125rem);
}

.mobile-list-footer .mobile-inline-pair { --mobile-inline-pair-gap: 8px; }
.mobile-list-footer__line {
  width: 18px;
  height: 1px;
  background: var(--mobile-workspace-line, var(--tms-line, var(--smis-line)));
}
</style>
