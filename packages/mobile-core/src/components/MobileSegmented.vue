<script setup lang="ts" generic="Value extends string">
import { computed, ref } from 'vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import { elementOf, type ElementTarget } from '../form-focus'

defineOptions({ options: { styleIsolation: 'shared' } })

const props = defineProps<{
  label: string
  modelValue: Value
  options: readonly { value: Value; label: string }[]
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: Value] }>()
const group = ref<ElementTarget>()
const focused = ref<number>()
const selected = computed(() => Math.max(0, props.options.findIndex(option => option.value === props.modelValue)))

function select(value: Value) {
  if (!props.disabled && value !== props.modelValue) emit('update:modelValue', value)
}

function tabIndex(index: number) {
  if (props.disabled) return -1
  // #ifdef H5
  return index === (focused.value ?? selected.value) ? 0 : -1
  // #endif
  return 0
}

function leave(event: FocusEvent) {
  // #ifdef H5
  if (!(event.relatedTarget instanceof Node) || !elementOf(group.value)?.contains(event.relatedTarget)) {
    focused.value = undefined
  }
  // #endif
}

function onKeyDown(event: KeyboardEvent, index: number) {
  if (event.isComposing || preventActionKey(event) || props.disabled) return
  // #ifdef H5
  const count = props.options.length
  if (!count) return
  let next: number
  switch (event.key) {
    case 'Home': next = 0; break
    case 'End': next = count - 1; break
    case 'ArrowLeft': next = (index - 1 + count) % count; break
    case 'ArrowRight': next = (index + 1) % count; break
    default: return
  }
  event.preventDefault()
  elementOf(group.value)?.querySelectorAll<HTMLElement>('.mobile-segmented__option')[next]?.focus()
  // #endif
}

function onKeyUp(event: KeyboardEvent, value: Value) {
  if (!event.isComposing) activateActionKey(event, () => select(value))
}
</script>

<template>
  <view ref="group" class="mobile-segmented" :class="{ 'mobile-segmented--enabled': !disabled }" role="group"
    :aria-label="label" @focusout="leave">
    <button
      v-for="(option, index) in options"
      :key="option.value"
      class="mobile-action mobile-segmented__option"
      :class="{ 'mobile-segmented__option--selected': option.value === modelValue }"
      role="button"
      :aria-pressed="option.value === modelValue"
      :disabled="disabled"
      :aria-disabled="disabled || undefined"
      :tabindex="tabIndex(index)"
      hover-class="mobile-action--pressed"
      @focus="focused = index"
      @click="select(option.value)"
      @keydown="onKeyDown($event, index)"
      @keyup="onKeyUp($event, option.value)"
    ><text>{{ option.label }}</text></button>
  </view>
</template>

<style scoped lang="scss">
.mobile-segmented {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, max(48px, 3.55em)), 1fr));
  gap: 4px;
  min-width: 0;
  padding: 4px;
  border-radius: 14px;
  font-size: max(22rpx, 12px, .875rem);
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
  font-size: inherit;
  font-weight: 620;
  line-height: 1.22;
  overflow-wrap: anywhere;
  text-align: center;
}

.mobile-segmented .mobile-segmented__option:focus-visible {
  outline: 2px solid var(--tms-primary-strong, var(--smis-primary-strong, #126f64));
  outline-offset: -2px;
}

.mobile-segmented .mobile-segmented__option--selected {
  background: var(--mobile-segmented-selection, var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface))));
  color: var(--mobile-segmented-selection-ink, var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary))));
  box-shadow: 0 1px 3px rgb(21 32 51 / 12%);
  font-weight: 720;
}

@media (hover: hover) {
  .mobile-segmented--enabled .mobile-segmented__option:hover {
    color: var(--mobile-segmented-selection-ink, var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary))));
  }
}
</style>
