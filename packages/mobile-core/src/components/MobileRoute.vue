<script setup lang="ts">
defineProps<{ origin: string; destination: string }>()
</script>

<template>
  <view class="mobile-route">
    <text class="mobile-route__station">{{ origin }}</text>
    <text class="mobile-route__arrow">→</text>
    <text class="mobile-route__station">{{ destination }}</text>
  </view>
</template>

<style scoped lang="scss">
.mobile-route {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
  color: var(--mobile-route-ink, var(--mobile-workspace-ink, var(--tms-text-strong)));
  font-size: var(--mobile-route-size, max(31rpx, 16px));
  font-weight: 720;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.mobile-route__station {
  min-width: 0;
  overflow-wrap: anywhere;
}

.mobile-route__arrow {
  flex: none;
  color: var(--mobile-route-accent, var(--mobile-workspace-accent, var(--tms-primary)));
  font-weight: 600;
}
</style>
