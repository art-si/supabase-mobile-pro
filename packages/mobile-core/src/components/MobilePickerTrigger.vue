<script setup lang="ts">
import { computed, getCurrentInstance, inject } from 'vue'
import MobileIcon from './MobileIcon.vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import { mobileFieldContext } from '../field-context'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const props = defineProps<{
  value?: string
  placeholder?: string
  label: string
  expanded: boolean
  disabled?: boolean
  invalid?: boolean
  compact?: boolean
  iconOnly?: boolean
  description?: string
  describedBy?: string
}>()
const emit = defineEmits<{ click: [] }>()
const context = inject(mobileFieldContext, undefined)
const valueId = `mobile-picker-value-${getCurrentInstance()?.uid}`
const valueDescription = computed(() => props.description || props.value)
const describedBy = computed(() => {
  const ids = [context?.value.describedBy, props.describedBy].filter(Boolean).join(' ').trim()
  if (!ids) return undefined
  return [...new Set([...ids.split(/\s+/), ...(valueDescription.value ? [valueId] : [])])].join(' ')
})
const isInvalid = computed(() => props.invalid || context?.value.invalid || undefined)

function activate() {
  if (!props.disabled) emit('click')
}
</script>

<template>
  <button
    class="mobile-action mobile-picker-trigger"
    :class="{
      'mobile-picker-trigger--placeholder': !value && !compact,
      'mobile-picker-trigger--invalid': isInvalid,
      'mobile-picker-trigger--compact': compact,
      'mobile-picker-trigger--icon-only': iconOnly
    }"
    :disabled="disabled"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled || undefined"
    :aria-label="label"
    :aria-description="valueDescription"
    aria-haspopup="dialog"
    :aria-expanded="expanded"
    :aria-invalid="isInvalid"
    :aria-describedby="describedBy"
    hover-class="mobile-action--pressed"
    @click="activate"
    @keydown="preventActionKey"
    @keyup="activateActionKey($event, activate)"
  >
    <text v-if="!iconOnly" class="mobile-picker-trigger__value">{{ value || placeholder }}</text>
    <text v-if="describedBy && valueDescription" :id="valueId" hidden>{{ valueDescription }}</text>
    <view class="mobile-picker-trigger__chevron" aria-hidden="true">
      <MobileIcon name="chevron" size="12px" />
    </view>
  </button>
</template>

<style scoped lang="scss">
@use '../styles/form';

.mobile-picker-trigger { @include form.select-trigger; }
.mobile-picker-trigger--invalid { @include form.error-border; }
.mobile-picker-trigger--placeholder { color: var(--tms-muted, var(--smis-muted, #66738a)); }
.mobile-picker-trigger--compact {
  padding-inline: 10px;
  border-color: transparent;
  background: var(--tms-primary-soft, var(--smis-primary-soft, #e8f5f0));
  color: var(--tms-primary, var(--smis-primary, #0f766e));
  font-size: max(24rpx, 13px);
  font-weight: 650;
}
.mobile-picker-trigger__value {
  min-width: 0;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
.mobile-picker-trigger__chevron {
  @include form.select-chevron;
  display: grid;
  place-items: center;
}
.mobile-picker-trigger--icon-only { display: grid; place-items: center; width: 48px; min-width: 48px; min-height: 48px; padding: 0; background: transparent; border-color: transparent; }
</style>
