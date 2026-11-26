<script setup lang="ts">
defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })
withDefaults(defineProps<{ label: string; block?: boolean; bare?: boolean }>(), { block: true })
</script>

<template>
  <view
    class="mobile-skeleton"
    :class="{ 'mobile-skeleton--panel': block && !bare }"
    role="status"
    :aria-label="label"
  >
    <view v-if="block" class="mobile-skeleton__card" aria-hidden="true">
      <view class="mobile-skeleton__header">
        <view class="mobile-skeleton__shape mobile-skeleton__avatar" />
        <view class="mobile-skeleton__lines">
          <view class="mobile-skeleton__shape mobile-skeleton__line mobile-skeleton__line--title" />
          <view class="mobile-skeleton__shape mobile-skeleton__line mobile-skeleton__line--short" />
        </view>
      </view>
      <slot>
        <view class="mobile-skeleton__shape mobile-skeleton__line" />
        <view class="mobile-skeleton__shape mobile-skeleton__line mobile-skeleton__line--title" />
      </slot>
    </view>
    <view v-else class="mobile-skeleton__shape mobile-skeleton__placeholder" aria-hidden="true" />
  </view>
</template>

<style scoped>
.mobile-skeleton { width: 100%; min-width: 0; }
.mobile-skeleton--panel {
  box-sizing: border-box;
  padding: var(--mobile-workspace-card-padding, 16px);
  border-radius: var(--mobile-workspace-card-radius, 16px);
  background: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface, #fff)));
}
.mobile-skeleton__card, .mobile-skeleton__lines { display: grid; min-width: 0; }
.mobile-skeleton__card { gap: var(--mobile-skeleton-card-gap, 10px); }
.mobile-skeleton__lines { gap: var(--mobile-skeleton-line-gap, 10px); }
.mobile-skeleton__header {
  display: grid;
  grid-template-columns: var(--mobile-skeleton-avatar-size, 44px) minmax(0, 1fr);
  align-items: center;
  gap: var(--mobile-skeleton-header-gap, 12px);
  margin-bottom: var(--mobile-skeleton-header-margin, 6px);
}
.mobile-skeleton__shape { background: var(--tms-surface-muted, var(--smis-surface-muted, #edf2ee)); }
.mobile-skeleton__avatar { aspect-ratio: 1; border-radius: 50%; }
.mobile-skeleton__line { height: var(--mobile-skeleton-line-height, .75rem); border-radius: var(--mobile-skeleton-line-radius, 6px); }
.mobile-skeleton__line--title { width: var(--mobile-skeleton-title-width, 66%); }
.mobile-skeleton__line--short { width: var(--mobile-skeleton-short-width, 40%); }
.mobile-skeleton__placeholder { width: min(35%, 120px); height: .75rem; margin: 12px auto; border-radius: 6px; }
</style>
