<script setup lang="ts">
import MobileInlineLabel from './MobileInlineLabel.vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'

defineOptions({ options: { styleIsolation: 'apply-shared' } })

interface MetricItem { label: string; value: string | number; unit?: string; tone?: 'danger' | 'warning'; emphasis?: boolean }
defineProps<{ items: readonly MetricItem[]; selectable?: boolean; summary?: boolean }>()
const emit = defineEmits<{ select: [index: number] }>()
</script>

<template>
  <view class="metric-grid" :class="{
    'metric-grid--single': items.length === 1,
    'metric-grid--pair': items.length === 2,
    'metric-grid--summary': summary,
    'metric-grid--emphasis': summary && !selectable && items.some(item => item.emphasis)
  }">
    <template v-for="(item, index) in items" :key="index">
      <button v-if="selectable" class="mobile-action metric-grid__item metric-grid__action"
        role="button" tabindex="0" :aria-label="`${item.label} ${item.value}${item.unit ? ' ' + item.unit : ''}`"
        hover-class="mobile-action--pressed"
        @click="emit('select', index)" @keydown="preventActionKey"
        @keyup="activateActionKey($event, () => emit('select', index))">
        <text class="metric-grid__value">{{ item.value }}</text>
        <view class="metric-grid__label metric-grid__route">
          <MobileInlineLabel icon="chevron" :label="item.label" :icon-size="11" icon-position="end" />
        </view>
      </button>
      <view v-else class="metric-grid__item" :class="[item.tone && 'metric-grid__item--' + item.tone, { 'metric-grid__item--emphasis': item.emphasis }]">
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

.metric-grid--single { grid-template-columns: minmax(0, 1fr); }
.metric-grid--pair { grid-template-columns: repeat(2, minmax(0, 1fr)); }

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
  font-size: max(24rpx, .75rem, 12px);
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  overflow-wrap: anywhere;
}

.metric-grid__value {
  color: var(--tms-text-strong, var(--smis-text-strong));
  min-width: 0;
  max-width: 100%;
  font-size: max(34rpx, 1.0625rem);
  font-weight: 700;
  display: block;
  line-height: 1.18;
  text-align: center;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}

.metric-grid__unit {
  display: inline-block;
  margin-inline-start: 4rpx;
  font-size: max(22rpx, .75rem, 12px);
  font-weight: 600;
  white-space: nowrap;
}
.metric-grid__action { width: 100%; }
.metric-grid__route { --mobile-inline-pair-gap: 4px; }
.metric-grid__action:focus-visible { outline-offset: -2px; }
.metric-grid__item--danger .metric-grid__value { color: var(--tms-red-strong, var(--smis-red-strong)); }
.metric-grid__item--warning .metric-grid__value { color: var(--tms-orange-strong, var(--smis-orange-strong)); }

.metric-grid--summary {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  border: 0;
  border-top: 1px solid var(--mobile-workspace-line);
  border-radius: 0;
  background: var(--mobile-workspace-line);
}

.metric-grid--summary .metric-grid__item {
  box-sizing: border-box;
  flex: 1 1 auto;
  min-width: min(100%, 10rem);
  max-width: 100%;
  min-height: 0;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 4px;
  padding: 12px var(--mobile-row-inset, 16px);
  border-radius: 0;
  background: var(--mobile-workspace-surface);
}

.metric-grid--summary .metric-grid__item + .metric-grid__item { border: 0; }
.metric-grid--summary .metric-grid__item::before { display: none; }
.metric-grid--summary .metric-grid__label { font-size: .8125rem; text-align: start; }

.metric-grid--summary .metric-grid__value {
  font-size: clamp(1.0625rem, 5vw, 1.375rem);
  line-height: 1.24;
  text-align: start;
}

.metric-grid--emphasis .metric-grid__value {
  font-size: clamp(1rem, 4vw, 1.125rem);
  font-weight: 600;
}

.metric-grid--emphasis .metric-grid__item--emphasis {
  flex-basis: 100%;
  padding-block: 14px;
}

.metric-grid--emphasis .metric-grid__item--emphasis .metric-grid__value {
  font-size: clamp(1.375rem, 6vw, 1.875rem);
  font-weight: 700;
}

</style>
