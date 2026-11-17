<script setup lang="ts">
import MobileIcon from './MobileIcon.vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const props = defineProps<{
  value?: string
  placeholder?: string
  label: string
  expanded: boolean
  disabled?: boolean
  invalid?: boolean
  compact?: boolean
  description?: string
  describedBy?: string
}>()
const emit = defineEmits<{ click: [] }>()

function activate() {
  if (!props.disabled) emit('click')
}
</script>

<template>
  <button
    class="mobile-action mobile-picker-trigger"
    :class="{
      'mobile-picker-trigger--placeholder': !value && !compact,
      'mobile-picker-trigger--invalid': invalid,
      'mobile-picker-trigger--compact': compact
    }"
    :disabled="disabled"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled || undefined"
    :aria-label="label"
    :aria-description="description || value || undefined"
    aria-haspopup="dialog"
    :aria-expanded="expanded"
    :aria-invalid="invalid || undefined"
    :aria-describedby="describedBy"
    hover-class="mobile-action--pressed"
    @click="activate"
    @keydown="preventActionKey"
    @keyup="activateActionKey($event, activate)"
  >
    <text class="mobile-picker-trigger__value">{{ value || placeholder }}</text>
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
</style>
