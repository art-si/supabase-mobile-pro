<script setup lang="ts">
import { THEME_PRESETS, type ThemePresetId } from '../theme'
import MobileInlineLabel from './MobileInlineLabel.vue'
import MobileThemeCards from './MobileThemeCards.vue'

defineOptions({ options: { styleIsolation: 'shared' } })

defineProps<{ modelValue: ThemePresetId }>()
const emit = defineEmits<{ 'update:modelValue': [preset: ThemePresetId] }>()

const options = THEME_PRESETS.map((preset) => ({
  ...preset,
  preview: {
    background: 'var(--mobile-workspace-canvas, var(--tms-bg, var(--smis-bg, #f2f3f6)))',
    surface: 'var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface, #fff)))',
    ink: 'var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong, #172033)))',
    accent: preset.color
  }
}))

function select(id: string) {
  const preset = THEME_PRESETS.find((option) => option.id === id)
  if (preset) emit('update:modelValue', preset.id)
}
</script>

<template>
  <view class="theme-picker">
    <view class="theme-picker__label">
      <MobileInlineLabel icon="settings" icon-size="18px" label="主题色" />
    </view>
    <MobileThemeCards :model-value="modelValue" :options="options" label="主题色" @update:model-value="select" />
  </view>
</template>

<style scoped lang="scss">
.theme-picker { display: grid; min-width: 0; gap: 8px; }
.theme-picker__label {
  --mobile-inline-pair-gap: 8px;
  display: flex;
  color: var(--mobile-workspace-muted, var(--tms-text-secondary, var(--smis-text-secondary)));
  font-size: max(14px, .875rem);
  font-weight: 650;
}
</style>
