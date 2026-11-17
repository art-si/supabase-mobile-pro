<script setup lang="ts">
import { activateActionKey, preventActionKey } from '../action-keyboard'
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })
withDefaults(defineProps<{ message: string; title?: string; retryText?: string; inline?: boolean }>(), {
  title: '暂时无法读取数据',
  retryText: '重试'
})
const emit = defineEmits<{ retry: [] }>()

function retry() {
  emit('retry')
}
</script>

<template>
  <view class="mobile-load-error" :class="{ 'mobile-load-error--inline': inline }">
    <view v-if="!inline" class="mobile-icon-box mobile-load-error__icon" aria-hidden="true"><MobileIcon name="notice" size="20px" /></view>
    <view class="mobile-load-error__body">
      <view class="mobile-load-error__copy" role="alert">
        <text class="mobile-load-error__title">{{ title }}</text>
        <text>{{ message }}</text>
      </view>
      <button
        class="mobile-action mobile-action--link mobile-load-error__retry"
        role="button"
        tabindex="0"
        hover-class="mobile-action--pressed"
        @click="retry"
        @keydown="preventActionKey"
        @keyup="activateActionKey($event, retry)"
      >{{ retryText }}</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mobile-load-error {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 12px;
  padding: 14px var(--mobile-workspace-card-padding, 14px) 8px;
  border: 1px solid var(--mobile-workspace-line, var(--tms-line, var(--smis-line)));
  border-radius: var(--mobile-workspace-card-radius, 16px);
  background: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface)));
}

.mobile-load-error__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: var(--tms-orange-strong, var(--smis-orange-strong));
  background: var(--tms-orange-soft, var(--smis-orange-soft));
}

.mobile-load-error__copy {
  display: grid;
  min-width: 0;
  gap: 4px;
  color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-text-muted, var(--smis-muted))));
  font-size: .875rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.mobile-load-error__title {
  color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong)));
  font-size: .9375rem;
  font-weight: 700;
}

.mobile-load-error__retry {
  --mobile-action-link-padding: 0;
  min-width: 44px;
  min-height: var(--tms-control-height, var(--smis-control-height, 44px));
  justify-content: flex-start;
  /* #ifdef H5 */
  scroll-margin-block: 8px;
  /* #endif */
}

.mobile-load-error--inline {
  grid-template-columns: minmax(0, 1fr);
  padding: 0 8px 0 14px;
  border: 0;
  box-shadow: inset 0 0 0 1px var(--mobile-workspace-line, var(--tms-line, var(--smis-line)));
}

.mobile-load-error--inline .mobile-load-error__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 8px;
}

.mobile-load-error--inline .mobile-load-error__copy { padding-block: 11px; }
.mobile-load-error--inline .mobile-load-error__retry {
  --mobile-action-link-padding: 0 8px;
  justify-content: center;
  outline-offset: -2px;
}

/* #ifdef H5 */
:global(uni-page-body:has(.bottom-nav) .mobile-load-error__retry) {
  scroll-margin-block-end: calc(8px + var(--mobile-nav-height, 0px));
}
/* #endif */
</style>
