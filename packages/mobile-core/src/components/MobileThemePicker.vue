<script setup lang="ts">
import { THEME_PRESETS, type ThemePresetId } from '../theme'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'

defineProps<{ modelValue: ThemePresetId }>()
const emit = defineEmits<{ 'update:modelValue': [preset: ThemePresetId] }>()
</script>

<template>
  <view class="theme-picker mobile-row mobile-row--static" role="group" aria-label="主题色">
    <view class="theme-picker__label">
      <MobileIcon name="settings" size="20px" />
      <text>主题色</text>
    </view>
    <view class="theme-picker__options">
      <MobileAction
        v-for="preset in THEME_PRESETS" :key="preset.id" class="theme-picker__choice"
        :aria-label="preset.name" :aria-pressed="preset.id === modelValue"
        @click="emit('update:modelValue', preset.id)"
      >
        <view
          class="theme-picker__swatch" :class="{ 'theme-picker__swatch--selected': preset.id === modelValue }"
          :style="{ '--mobile-theme-color': preset.color }" aria-hidden="true"
        >
          <MobileIcon v-if="preset.id === modelValue" name="check" size="18px" />
        </view>
      </MobileAction>
    </view>
  </view>
</template>

<style scoped lang="scss">
.theme-picker {
  min-height: 62px;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding-block: 8px;
}

.theme-picker__label,
.theme-picker__options {
  display: flex;
  align-items: center;
}

.theme-picker__label { gap: 9px; font-size: 15px; font-weight: 650; }
.theme-picker__options { gap: 6px; }

.theme-picker__choice {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.theme-picker__swatch {
  position: relative;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--mobile-theme-color);
}

.theme-picker__swatch--selected::after {
  position: absolute;
  inset: -5px;
  border: 2px solid var(--mobile-theme-color);
  border-radius: inherit;
  content: '';
  opacity: .55;
  pointer-events: none;
}
</style>
