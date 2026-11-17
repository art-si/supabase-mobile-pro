<script setup lang="ts">
import type { MobileIconName } from '../icons'
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })
withDefaults(defineProps<{
  icon: MobileIconName
  title: string
  description?: string
  announce?: 'status' | 'alert'
}>(), { announce: 'status' })
</script>

<template>
  <view class="mobile-empty">
    <view class="mobile-empty__copy" :role="announce">
      <view class="mobile-icon-box mobile-empty__icon" aria-hidden="true"><MobileIcon :name="icon" size="22px" /></view>
      <text class="mobile-empty__title" role="heading" aria-level="2">{{ title }}</text>
      <text v-if="description" class="mobile-empty__description">{{ description }}</text>
    </view>
    <slot />
  </view>
</template>

<style scoped lang="scss">
.mobile-empty {
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: 12px;
  padding: 32px var(--mobile-workspace-card-padding, 16px);
  text-align: center;
}

.mobile-empty__copy {
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: 8px;
  overflow-wrap: anywhere;
}

.mobile-empty__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  color: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  background: var(--tms-primary-soft, var(--smis-primary-soft));
}

.mobile-empty__title {
  color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong)));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
  text-wrap: balance;
}

.mobile-empty__description {
  max-width: 30ch;
  color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-text-muted, var(--smis-muted))));
  font-size: .875rem;
  line-height: 1.55;
  text-wrap: pretty;
}
</style>
