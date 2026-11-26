<script setup lang="ts">
import { activateButtonKey, preventActionKey } from '../action-keyboard'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const props = withDefaults(defineProps<{
  modelValue: boolean
  disabled?: boolean
  ariaLabel?: string
  ariaDescribedby?: string
  ariaInvalid?: boolean
  shape?: 'circle' | 'square'
  indicatorSize?: string
  iconSize?: string
  checkedColor?: string
  uncheckedColor?: string
}>(), { shape: 'circle', indicatorSize: '18px', ariaInvalid: undefined })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function toggle() {
  if (!props.disabled) emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    class="mobile-action mobile-checkbox"
    role="checkbox"
    :aria-label="ariaLabel"
    :aria-checked="modelValue"
    :aria-describedby="ariaDescribedby"
    :aria-invalid="ariaInvalid"
    :disabled="disabled"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled || undefined"
    hover-class="mobile-action--pressed"
    @click="toggle"
    @keydown="preventActionKey"
    @keyup="activateButtonKey"
  >
    <view class="mobile-checkbox__indicator" :style="{ '--mobile-checkbox-size': indicatorSize }" aria-hidden="true">
      <wd-checkbox
        :model-value="modelValue"
        :type="shape"
        :readonly="true"
        :checked-color="checkedColor"
        :unchecked-color="uncheckedColor"
        :custom-style="`--wot-checkbox-icon-size:${iconSize || indicatorSize};pointer-events:none;`"
      />
    </view>
    <slot />
  </button>
</template>

<style scoped>
.mobile-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  align-self: flex-start;
  gap: var(--mobile-checkbox-gap, 10px);
  flex: 0 1 auto;
  min-width: 48px;
  min-height: var(--mobile-checkbox-min-height, 48px);
  padding: 0;
  background: transparent;
}
.mobile-checkbox__indicator {
  display: grid;
  place-items: center;
  width: var(--mobile-checkbox-size);
  height: var(--mobile-checkbox-size);
  flex: 0 0 var(--mobile-checkbox-size);
  pointer-events: none;
}
</style>
