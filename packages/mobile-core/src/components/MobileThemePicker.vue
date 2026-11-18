<script setup lang="ts">
import { THEME_PRESETS, type ThemePresetId } from '../theme'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'
import MobileInlineLabel from './MobileInlineLabel.vue'

defineOptions({ options: { styleIsolation: 'shared' } })

defineProps<{ modelValue: ThemePresetId }>()
const emit = defineEmits<{ 'update:modelValue': [preset: ThemePresetId] }>()
</script>

<template>
  <view class="theme-picker" role="group" aria-label="主题色">
    <view class="theme-picker__label">
      <MobileInlineLabel icon="settings" icon-size="18px" label="主题色" />
    </view>
    <view class="mobile-group theme-picker__options">
      <MobileAction
        v-for="preset in THEME_PRESETS" :key="preset.id" class="mobile-row theme-picker__choice"
        :aria-label="preset.name" :aria-pressed="preset.id === modelValue"
        @click="emit('update:modelValue', preset.id)"
      >
        <view class="theme-picker__swatch" :style="{ backgroundColor: preset.color }" aria-hidden="true" />
        <view class="mobile-row__body">
          <text class="mobile-row__label theme-picker__name">{{ preset.name }}</text>
          <text class="mobile-row__detail theme-picker__description">{{ preset.description }}</text>
        </view>
        <view class="mobile-icon-box theme-picker__check" aria-hidden="true">
          <MobileIcon v-if="preset.id === modelValue" name="check" size="20px" />
        </view>
      </MobileAction>
    </view>
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
.theme-picker .theme-picker__choice:focus-visible {
  outline: 2px solid var(--tms-primary-strong, var(--smis-primary-strong));
  outline-offset: -3px;
}
.theme-picker__swatch {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 10px;
}
.theme-picker__name { font-size: max(15px, .9375rem); }
.theme-picker__description { font-size: max(13px, .8125rem); }
.theme-picker__check {
  width: 24px;
  height: 24px;
  color: var(--tms-primary-strong, var(--smis-primary-strong));
}
</style>
