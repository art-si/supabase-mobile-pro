<script setup lang="ts">
import MobileThemePicker from './MobileThemePicker.vue'
import type { ThemePresetId } from '../theme'

const props = defineProps<{
  modelValue: ThemePresetId
  persistPreset: (preset: ThemePresetId) => boolean
  hint?: string
}>()

function selectTheme(preset: ThemePresetId) {
  if (!props.persistPreset(preset)) {
    uni.showToast({ title: '主题已切换，保存失败，请重试', icon: 'none' })
  }
}
</script>

<template>
  <view>
    <text class="mobile-group-title" role="heading" aria-level="2">外观</text>
    <view class="mobile-group">
      <MobileThemePicker :model-value="modelValue" @update:model-value="selectTheme" />
    </view>
    <text v-if="hint" class="mobile-appearance-settings__hint">{{ hint }}</text>
  </view>
</template>

<style scoped lang="scss">
.mobile-appearance-settings__hint {
  display: block;
  margin: 12px 4px 0;
  color: var(--tms-muted, var(--smis-muted));
  font-size: 13px;
  line-height: 1.5;
}
</style>
