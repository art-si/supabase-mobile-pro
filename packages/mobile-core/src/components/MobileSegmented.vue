<script setup lang="ts" generic="Value extends string">
import MobileAction from './MobileAction.vue'

const props = defineProps<{
  label: string
  modelValue: Value
  options: readonly { value: Value; label: string }[]
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: Value] }>()

function select(value: Value) {
  if (value !== props.modelValue) emit('update:modelValue', value)
}
</script>

<template>
  <view class="mobile-segmented" role="group" :aria-label="label">
    <MobileAction
      v-for="option in options"
      :key="option.value"
      class="mobile-segmented__option"
      :class="{ 'mobile-segmented__option--selected': option.value === modelValue }"
      :aria-pressed="option.value === modelValue"
      :disabled="disabled"
      @click="select(option.value)"
    >{{ option.label }}</MobileAction>
  </view>
</template>

<style scoped lang="scss">
.mobile-segmented {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 48px), 1fr));
  gap: 4px;
  min-width: 0;
  padding: 4px;
  border-radius: 14px;
  background: var(--mobile-segmented-background, var(--tms-surface-muted, var(--smis-surface-muted)));
}

.mobile-segmented .mobile-segmented__option {
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 44px;
  padding: 4px;
  border-radius: 10px;
  color: var(--mobile-segmented-ink, var(--mobile-workspace-muted, var(--tms-text-secondary, var(--smis-text-secondary))));
  font-size: max(22rpx, 12px);
  font-weight: 620;
  line-height: 1.22;
  overflow-wrap: anywhere;
  text-align: center;
}

.mobile-segmented .mobile-segmented__option--selected {
  background: var(--mobile-segmented-selection, var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface))));
  color: var(--mobile-segmented-selection-ink, var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary))));
  box-shadow: 0 1px 3px rgb(21 32 51 / 12%);
  font-weight: 720;
}

@media (hover: hover) {
  .mobile-segmented__option:hover:not([aria-disabled=true]) {
    color: var(--mobile-segmented-selection-ink, var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary))));
  }
}
</style>
