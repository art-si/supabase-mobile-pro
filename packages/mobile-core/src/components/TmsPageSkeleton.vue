<script setup lang="ts">
import MobileLoadError from './MobileLoadError.vue'
import MobileLoadingStatus from './MobileLoadingStatus.vue'

defineOptions({ options: { styleIsolation: 'shared' } })

withDefaults(
  defineProps<{
    label?: string
    compact?: boolean
    error?: string
  }>(),
  {
    label: '正在加载页面信息…',
    compact: false
  }
)

defineEmits<{
  retry: []
}>()
</script>

<template>
  <view class="page-skeleton" :class="{ 'page-skeleton--compact': compact }">
    <MobileLoadError v-if="error" :message="error" title="页面加载失败" retry-text="重新加载" @retry="$emit('retry')" />
    <template v-else>
      <view class="page-skeleton__status">
        <MobileLoadingStatus :label="label" />
      </view>
      <view class="page-skeleton__card" aria-hidden="true">
        <view class="page-skeleton__row">
          <view class="page-skeleton__circle" />
          <view class="page-skeleton__lines">
            <view class="page-skeleton__line page-skeleton__line--medium" />
            <view class="page-skeleton__line page-skeleton__line--short" />
          </view>
        </view>
        <view class="page-skeleton__tiles">
          <view class="page-skeleton__tile" /><view class="page-skeleton__tile" />
        </view>
      </view>
      <view v-if="!compact" class="page-skeleton__card page-skeleton__card--form" aria-hidden="true">
        <view class="page-skeleton__line page-skeleton__line--short" />
        <view class="page-skeleton__input" />
        <view class="page-skeleton__line page-skeleton__line--medium page-skeleton__line--after-input" />
        <view class="page-skeleton__uploads">
          <view class="page-skeleton__upload" /><view class="page-skeleton__upload" /><view class="page-skeleton__upload" />
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.page-skeleton {
  padding: 24rpx var(--mobile-skeleton-inline-padding, 26rpx) 56rpx;
}

.page-skeleton__status {
  --mobile-loading-size: 25rpx;
  --mobile-loading-stroke: 4rpx;
  display: flex;
  margin: 4rpx 4rpx 22rpx;
  font-size: max(23rpx, 12px);
}

.page-skeleton__card {
  padding: 28rpx;
  background: var(--mobile-workspace-surface, var(--tms-surface));
  border: 1px solid var(--mobile-workspace-line, var(--tms-line-subtle));
  border-radius: var(--mobile-workspace-card-radius, 16px);
}

.page-skeleton__card + .page-skeleton__card {
  margin-top: 20rpx;
}

.page-skeleton__row {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.page-skeleton__circle {
  width: 66rpx;
  height: 66rpx;
  border-radius: 50%;
  background: var(--tms-surface-muted);
}

.page-skeleton__lines {
  flex: 1;
}

.page-skeleton__line,
.page-skeleton__input,
.page-skeleton__tile,
.page-skeleton__upload {
  background: var(--tms-surface-muted);
}

.page-skeleton__line {
  width: 100%;
  height: 22rpx;
  border-radius: 999rpx;
}

.page-skeleton__line + .page-skeleton__line {
  margin-top: 14rpx;
}

.page-skeleton__line--medium {
  width: 58%;
}

.page-skeleton__line--short {
  width: 34%;
}

.page-skeleton__tiles,
.page-skeleton__uploads {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 26rpx;
}

.page-skeleton__tile {
  height: 86rpx;
  border-radius: 16rpx;
}

.page-skeleton__line--after-input {
  margin-top: 30rpx;
}

.page-skeleton__input {
  height: 86rpx;
  margin-top: 18rpx;
  border-radius: 16rpx;
}

.page-skeleton__uploads {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 18rpx;
}

.page-skeleton__upload {
  aspect-ratio: 1;
  border-radius: 16rpx;
}

.page-skeleton--compact {
  padding-block: 12px 20px;
}
</style>
