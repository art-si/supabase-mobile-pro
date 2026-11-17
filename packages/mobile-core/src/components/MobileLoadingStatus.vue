<script setup lang="ts">
defineOptions({ options: { styleIsolation: 'apply-shared' } })
defineProps<{ label: string; block?: boolean }>()
</script>

<template>
  <view class="mobile-inline-pair mobile-loading-status" :class="{ 'mobile-loading-status--block': block }" role="status">
    <view class="mobile-loading-status__indicator" aria-hidden="true" />
    <text class="mobile-loading-status__label">{{ label }}</text>
  </view>
</template>

<style scoped lang="scss">
.mobile-loading-status {
  --mobile-inline-pair-gap: var(--mobile-loading-gap, 14rpx);
  color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted)));
  line-height: inherit;
}

.mobile-loading-status--block {
  --mobile-loading-gap: 8px;
  display: flex;
  justify-content: center;
  min-height: 64px;
  font-size: max(14px, .875rem);
}

.mobile-loading-status__indicator {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: var(--mobile-loading-size, 28px);
  height: var(--mobile-loading-size, 28px);
  border: var(--mobile-loading-stroke, 2px) solid var(--tms-primary-soft, var(--smis-primary-soft));
  border-top-color: currentColor;
  border-radius: 50%;
  color: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  animation: mobile-loading-spin .8s linear infinite;
}

.mobile-loading-status__label {
  min-width: 0;
  overflow-wrap: anywhere;
}

@keyframes mobile-loading-spin {
  to { transform: rotate(360deg); }
}

/* #ifdef H5 */
@media (prefers-reduced-motion: reduce) {
  .mobile-loading-status__indicator {
    animation: none !important;
    border-color: currentColor;
  }
}
/* #endif */
</style>
