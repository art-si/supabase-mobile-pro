<script setup lang="ts">
defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const props = defineProps<{ disabled?: boolean; variant?: 'plain' | 'link' }>()
const emit = defineEmits<{ click: [] }>()

function activate() {
  if (!props.disabled) emit('click')
}

function preventDefaultActivation(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return false
  event.preventDefault()
  event.stopPropagation()
  return true
}

function activateFromKeyboard(event: KeyboardEvent) {
  if (preventDefaultActivation(event)) activate()
}
</script>

<template>
  <button
    class="mobile-action"
    :class="{ 'mobile-action--link': variant === 'link' }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
    hover-class="mobile-action--pressed"
    @click="activate"
    @keydown="preventDefaultActivation"
    @keyup="activateFromKeyboard($event)"
  >
    <slot />
  </button>
</template>
