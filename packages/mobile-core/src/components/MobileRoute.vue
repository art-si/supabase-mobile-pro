<script setup lang="ts">
defineProps<{ origin: string; destination: string }>()
</script>

<template>
  <view class="mobile-route">
    <text class="mobile-route__station">{{ origin }}</text>
    <view class="mobile-route__destination">
      <text class="mobile-route__description">至</text>
      <text class="mobile-route__arrow" aria-hidden="true">→</text>
      <text class="mobile-route__station">{{ destination }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mobile-route {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  min-width: 0;
  gap: 2px 8px;
  color: var(--mobile-route-ink, var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong))));
  font-size: var(--mobile-route-size, max(31rpx, 16px, 1rem));
  font-weight: 720;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.mobile-route__station, .mobile-route__destination {
  min-width: 0;
  max-width: 100%;
}
.mobile-route__station {
  overflow-wrap: anywhere;
}
.mobile-route__destination { display: flex; align-items: baseline; gap: 8px; }
.mobile-route__description {
  position: absolute;
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
  overflow: hidden;
}

.mobile-route__arrow {
  flex: none;
  color: var(--mobile-route-accent, var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary))));
  font-weight: 600;
}
</style>
