<script setup lang="ts">
import type { MobileStatusTone } from '../theme'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })
defineProps<{ label: string; tone: MobileStatusTone; hideDot?: boolean }>()
</script>

<template>
  <view class="status-tag" :class="'status-tag--' + tone">
    <text v-if="!hideDot" class="status-tag__dot" aria-hidden="true" />
    <text class="status-tag__label">{{ label }}</text>
  </view>
</template>

<style scoped lang="scss">
.status-tag {
  box-sizing: border-box;
  flex: 0 0 auto;
  min-width: min(100%, 48px);
  max-width: 100%;
  min-height: max(46rpx, 24px);
  padding: 4px 8px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: max(22rpx, 12px, .75rem);
  font-weight: 700;
  line-height: 1.25;
}
.status-tag__label { min-width: 0; overflow-wrap: anywhere; }

.status-tag__dot {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.88;
}

.status-tag--blue {
  color: var(--tms-primary-strong, var(--smis-primary-strong));
  background: var(--tms-primary-soft, var(--smis-primary-soft));
}

.status-tag--green {
  color: #087451;
  background: var(--tms-green-soft, var(--smis-green-soft));
}

.status-tag--orange {
  color: #8a4b06;
  background: var(--tms-orange-soft, var(--smis-orange-soft));
}

.status-tag--red {
  color: var(--tms-red-strong, var(--smis-red-strong));
  background: var(--tms-red-soft, var(--smis-red-soft));
}

.status-tag--gray {
  color: var(--mobile-workspace-muted, #566174);
  background: var(--tms-surface-muted, var(--smis-surface-muted));
}
</style>
