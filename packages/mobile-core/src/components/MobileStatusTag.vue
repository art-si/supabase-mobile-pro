<script setup lang="ts">
import type { MobileStatusTone } from '../theme'

defineProps<{ label: string; tone: MobileStatusTone; hideDot?: boolean }>()
</script>

<template>
  <view class="status-tag" :class="'status-tag--' + tone">
    <text v-if="!hideDot" class="status-tag__dot" aria-hidden="true" />
    {{ label }}
  </view>
</template>

<style scoped lang="scss">
.status-tag {
  min-width: 96rpx;
  min-height: max(46rpx, 24px);
  padding: 0 16rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9rpx;
  font-size: max(22rpx, 12px);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.status-tag__dot {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.88;
}

.status-tag--blue {
  color: var(--tms-primary, var(--smis-primary));
  background: var(--tms-primary-soft, var(--smis-primary-soft));
}

.status-tag--green {
  color: var(--tms-green-strong, var(--smis-green-strong));
  background: var(--tms-green-soft, var(--smis-green-soft));
}

.status-tag--orange {
  color: var(--tms-orange-strong, var(--smis-orange-strong));
  background: var(--tms-orange-soft, var(--smis-orange-soft));
}

.status-tag--red {
  color: var(--tms-red-strong, var(--smis-red-strong));
  background: var(--tms-red-soft, var(--smis-red-soft));
}

.status-tag--gray {
  color: var(--tms-text-secondary, var(--smis-text-secondary));
  background: var(--tms-surface-muted, var(--smis-surface-muted));
}
</style>
