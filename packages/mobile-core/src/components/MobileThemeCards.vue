<script setup lang="ts">
import { activateActionKey, preventActionKey } from '../action-keyboard'
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { styleIsolation: 'apply-shared' } })

defineProps<{
  modelValue: string
  label: string
  options: readonly {
    id: string
    name: string
    description: string
    preview: { background: string; surface: string; ink: string; accent: string }
  }[]
}>()

const emit = defineEmits<{ 'update:modelValue': [id: string] }>()

function select(id: string) {
  emit('update:modelValue', id)
}
</script>

<template>
  <view class="theme-picker__options" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.id"
      class="mobile-action theme-picker__choice"
      :class="{ 'theme-picker__choice--selected': option.id === modelValue }"
      role="button"
      :tabindex="0"
      :aria-label="option.name"
      :aria-pressed="option.id === modelValue"
      hover-class="mobile-action--pressed"
      @click="select(option.id)"
      @keydown="preventActionKey"
      @keyup="activateActionKey($event, () => select(option.id))"
    >
      <view
        class="theme-preview"
        aria-hidden="true"
        :style="{
          backgroundColor: option.preview.background,
          '--theme-preview-surface': option.preview.surface,
          '--theme-preview-ink': option.preview.ink,
          '--theme-preview-accent': option.preview.accent
        }"
      >
        <view class="theme-preview__heading" />
        <view class="theme-preview__content"><view /><view /></view>
        <view class="theme-preview__action" />
      </view>
      <text class="theme-picker__name">{{ option.name }}</text>
      <view class="theme-picker__state">
        <view v-if="option.id === modelValue" class="theme-picker__check" aria-hidden="true">
          <MobileIcon name="check" :size="14" />
        </view>
        <text>{{ option.id === modelValue ? '使用中' : option.description }}</text>
      </view>
    </button>
  </view>
</template>

<style scoped lang="scss">
.theme-picker__options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 5.75rem), 1fr));
  gap: 8px;
  min-width: 0;
}

.theme-picker__choice.mobile-action {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
  min-height: 44px;
  padding: 8px;
  border: 1px solid var(--mobile-workspace-line, var(--tms-line, var(--smis-line, #dce1e8)));
  border-radius: 16px;
  background: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface, #fff)));
  text-align: left;
  white-space: normal;
}

.theme-picker__choice--selected.mobile-action {
  border-color: var(--mobile-workspace-accent, var(--tms-primary-strong, var(--smis-primary-strong, #0f766e)));
  box-shadow: 0 0 0 1px var(--mobile-workspace-accent, var(--tms-primary-strong, var(--smis-primary-strong, #0f766e)));
}

.theme-picker__choice.mobile-action:focus-visible {
  outline: 2px solid var(--mobile-workspace-focus, var(--tms-primary-strong, var(--smis-primary-strong, #0f766e)));
  outline-offset: 2px;
}

.theme-preview {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 56px;
  padding: 6px 8px;
  border-radius: 9px;
}

.theme-preview__heading {
  width: 56%;
  height: 5px;
  border-radius: 3px;
  background: var(--theme-preview-ink);
}

.theme-preview__content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 8px;
  border-radius: 5px;
  background: var(--theme-preview-surface);
}

.theme-preview__content view {
  height: 3px;
  border-radius: 2px;
  background: var(--theme-preview-ink);
  opacity: .22;
}

.theme-preview__content view:last-child { width: 65%; }

.theme-preview__action {
  width: 45%;
  height: 10px;
  border-radius: 3px;
  background: var(--theme-preview-accent);
}

.theme-picker__name {
  color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong, #172033)));
  font-size: max(14px, .875rem);
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.theme-picker__state {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 1.5em;
  color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted, #566174)));
  font-size: max(12px, .75rem);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.theme-picker__choice--selected .theme-picker__state {
  color: var(--mobile-workspace-accent, var(--tms-primary-strong, var(--smis-primary-strong, #0f766e)));
}

.theme-picker__check {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
}
</style>
