<script setup lang="ts">
import { activateActionKey, preventActionKey } from '../action-keyboard'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const props = withDefaults(defineProps<{
  disabled?: boolean
  variant?: 'plain' | 'link' | 'icon'
  ariaLabel?: string
  ariaPressed?: boolean
}>(), { ariaPressed: undefined })
const emit = defineEmits<{ click: [] }>()

function activate() {
  if (!props.disabled) emit('click')
}
</script>

<template>
  <button
    class="mobile-action"
    :class="{ 'mobile-action--link': variant === 'link', 'mobile-action--icon': variant === 'icon' }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
    :aria-label="ariaLabel"
    :aria-pressed="ariaPressed"
    hover-class="mobile-action--pressed"
    @click="activate"
    @keydown="preventActionKey"
    @keyup="activateActionKey($event, activate)"
  >
    <slot />
  </button>
</template>
