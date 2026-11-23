<script setup lang="ts">
import { preventActionKey, activateButtonKey } from '../action-keyboard'
import MobileInlineLabel from './MobileInlineLabel.vue'

defineOptions({ options: { styleIsolation: 'apply-shared' } })
defineProps<{ title: string; description?: string; actionLabel?: string }>()
defineEmits<{ action: [] }>()
</script>

<template>
  <view class="mobile-section-heading">
    <view class="mobile-section-heading__copy">
      <text class="mobile-section-heading__title" role="heading" aria-level="2">{{ title }}</text>
      <text v-if="description" class="mobile-section-heading__description">{{ description }}</text>
    </view>
    <button class="mobile-action mobile-action--link" v-if="actionLabel" @click="$emit('action')" role="button" tabindex="0" hover-class="mobile-action--pressed" @keydown="preventActionKey" @keyup="activateButtonKey">
      <MobileInlineLabel :label="actionLabel" icon="arrow-right" icon-position="end" />
    </button>
  </view>
</template>

<style scoped lang="scss">
.mobile-section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 0 8px;
}

.mobile-section-heading__copy {
  display: grid;
  flex: 1 1 132px;
  min-width: 0;
  gap: 3px;
  overflow-wrap: anywhere;
}

.mobile-section-heading__title {
  color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong)));
  font-size: max(16px, 1rem);
  font-weight: 700;
  line-height: 1.35;
}

.mobile-section-heading__description {
  color: var(--mobile-workspace-muted, var(--tms-text-secondary, var(--smis-text-secondary)));
  font-size: max(13px, .8125rem);
  line-height: 1.45;
}

.mobile-section-heading .mobile-action {
  --mobile-action-link-color: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  min-width: 44px;
  max-width: 100%;
}
</style>
