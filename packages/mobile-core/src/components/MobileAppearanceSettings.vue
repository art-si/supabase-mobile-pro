<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { elementOf, type ElementTarget } from '../form-focus'
import MobileAction from './MobileAction.vue'
import MobileThemePicker from './MobileThemePicker.vue'
import type { ThemePresetId } from '../theme'

const props = defineProps<{
  modelValue: ThemePresetId
  persistPreset: (preset: ThemePresetId) => boolean
}>()
const section = ref<ElementTarget>()
const pending = ref<ThemePresetId>()

function selectTheme(preset: ThemePresetId) {
  pending.value = props.persistPreset(preset) ? undefined : preset
}

function retry() {
  if (!pending.value) return
  selectTheme(pending.value)
  // #ifdef H5
  if (!pending.value) void nextTick(() => {
    elementOf(section.value)?.querySelector<HTMLElement>('.theme-picker__choice[aria-pressed="true"]')?.focus({ preventScroll: true })
  })
  // #endif
}
</script>

<template>
  <view ref="section" class="mobile-appearance-settings">
    <MobileThemePicker :model-value="modelValue" @update:model-value="selectTheme" />
    <view v-if="pending" class="mobile-appearance-settings__feedback">
      <text role="alert">主题色已应用到当前页面，暂未保存。</text>
      <MobileAction variant="link" @click="retry">重试保存</MobileAction>
    </view>
    <text v-else class="mobile-appearance-settings__hint">切换后立即应用，下次打开时保留。</text>
  </view>
</template>

<style scoped lang="scss">
.mobile-appearance-settings { display: grid; min-width: 0; gap: 8px; }
.mobile-appearance-settings__hint, .mobile-appearance-settings__feedback {
  margin-inline: 4px;
  color: var(--mobile-workspace-muted, var(--tms-text-secondary, var(--smis-text-secondary)));
  font-size: max(13px, .8125rem);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.mobile-appearance-settings__feedback {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 8px;
}
</style>
