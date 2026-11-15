<script setup lang="ts">
interface MetricItem { label: string; value: string | number; unit?: string; tone?: 'danger' | 'warning' }
defineProps<{ items: readonly MetricItem[]; selectable?: boolean }>()
const emit = defineEmits<{ select: [index: number] }>()

function keyboardSelect(event: KeyboardEvent, index: number) {
  if (!event.repeat) emit('select', index)
}
</script>

<template>
  <view class="metric-grid">
    <template v-for="(item, index) in items" :key="index">
      <button v-if="selectable" class="metric-grid__item metric-grid__action"
        role="button" tabindex="0" :aria-label="item.label + ' ' + item.value + ' 单'"
        @click="emit('select', index)" @keydown.enter.prevent="keyboardSelect($event, index)"
        @keydown.space.prevent="keyboardSelect($event, index)">
        <text class="metric-grid__value">{{ item.value }}</text>
        <text class="metric-grid__label">{{ item.label }}</text>
      </button>
      <view v-else class="metric-grid__item" :class="item.tone && 'metric-grid__item--' + item.tone">
        <text class="metric-grid__label">{{ item.label }}</text>
        <view class="metric-grid__value">
          <text>{{ item.value }}</text>
          <text v-if="item.unit" class="metric-grid__unit">{{ item.unit }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--mobile-metric-gap, 14rpx);
  background: var(--mobile-metric-grid-background, transparent);
  border: var(--mobile-metric-grid-border, 0);
  border-radius: var(--mobile-metric-grid-radius, 0px);
  overflow: hidden;
}

.metric-grid__item {
  position: relative;
  min-width: 0;
  min-height: var(--mobile-metric-height, 136rpx);
  padding: 22rpx 14rpx;
  overflow: hidden;
  border: var(--mobile-metric-border, 1rpx solid var(--tms-line, var(--smis-line)));
  border-radius: var(--mobile-metric-radius, 20rpx);
  background: var(--mobile-metric-background, linear-gradient(150deg, var(--tms-surface, var(--smis-surface)) 0%, var(--tms-primary-soft, var(--smis-primary-soft)) 100%));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 13rpx;
}

.metric-grid__item::before {
  display: var(--mobile-metric-decoration, block);
  position: absolute;
  top: 0;
  left: 22rpx;
  right: 22rpx;
  height: 5rpx;
  content: '';
  border-radius: 0 0 999rpx 999rpx;
  background: linear-gradient(90deg, var(--tms-primary, var(--smis-primary)), var(--tms-primary-bright, var(--smis-primary-bright)));
  opacity: 0.72;
}

.metric-grid__item + .metric-grid__item {
  border-inline-start: var(--mobile-metric-divider, 1rpx solid var(--tms-line, var(--smis-line)));
}

.metric-grid__label {
  min-width: 0;
  max-width: 100%;
  color: var(--tms-muted, var(--smis-muted));
  font-size: max(24rpx, 12px);
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  overflow-wrap: anywhere;
}

.metric-grid__value {
  color: var(--tms-text-strong, var(--smis-text-strong));
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  font-size: 34rpx;
  font-weight: 700;
  display: flex;
  align-items: flex-end;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.metric-grid__unit {
  margin-left: 4rpx;
  font-size: max(22rpx, 12px);
  font-weight: 600;
  line-height: 1.1;
}
.metric-grid__action { width: 100%; margin: 0; touch-action: manipulation; }
.metric-grid__action::after { border: 0; }
.metric-grid__action:active { background: var(--tms-primary-soft, var(--smis-primary-soft)); }
.metric-grid__action:focus-visible { outline: 4rpx solid var(--tms-primary, var(--smis-primary)); outline-offset: -4rpx; }
.metric-grid__item--danger .metric-grid__value { color: var(--tms-red-strong, var(--smis-red-strong)); }
.metric-grid__item--warning .metric-grid__value { color: var(--tms-orange-strong, var(--smis-orange-strong)); }
</style>
