<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { nativeFieldOf, useNativeFieldAttributes } from '../form-focus'

const props = withDefaults(defineProps<{
  field: string
  label: string
  inputLabel?: string
  placeholder?: string
  maxlength?: number
  error?: string
  hint?: string
  showCount?: boolean
  required?: boolean
  disabled?: boolean
  focus?: boolean
  password?: boolean
  multiline?: boolean
  readonly?: boolean
  inputmode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email'
  autocomplete?: string
}>(), { maxlength: 120, inputmode: 'text', autocomplete: 'off' })

const model = defineModel<string>({ default: '' })
defineEmits<{ confirm: [] }>()
const slots = useSlots()
const nativeId = computed(() => `${props.field}-input`)
const describedBy = computed(() => [props.hint && `${props.field}-hint`, props.error && `${props.field}-error`].filter(Boolean).join(' ') || undefined)
const hasCount = computed(() => props.showCount && !props.readonly && props.maxlength >= 0)
const controlState = computed(() => ({
  'mobile-field__control--error': Boolean(props.error),
  'mobile-field__control--disabled': props.disabled
}))
const labelFor = computed(() => {
  // #ifdef H5
  if (!props.readonly && !slots.default) return nativeId.value
  // #endif
  return props.field
})
const control = useNativeFieldAttributes(() => ({
  id: nativeId.value,
  name: props.field,
  'aria-label': props.inputLabel || props.label,
  'aria-invalid': props.error ? 'true' : undefined,
  'aria-required': props.required ? 'true' : undefined,
  'aria-describedby': describedBy.value,
  autocomplete: props.autocomplete,
  inputmode: props.inputmode
}))

function focusField() {
  // #ifdef H5
  nativeFieldOf(control.value)?.focus()
  // #endif
}

const type = computed(() => {
  if (props.inputmode === 'numeric') return 'number'
  if (props.inputmode === 'decimal') return 'digit'
  return 'text'
})
</script>

<template>
  <view class="mobile-field">
    <label class="mobile-field__label" :for="labelFor" @click="focusField">
      {{ label }}
      <text v-if="required" class="mobile-field__required" aria-hidden="true">*</text>
    </label>
    <slot>
      <text v-if="readonly" class="mobile-field__control mobile-field__control--readonly" :id="field">
        {{ model || '—' }}
      </text>
      <textarea
        v-else-if="multiline"
        ref="control"
        :id="field"
        v-model="model"
        class="mobile-field__control mobile-field__control--textarea"
        :class="controlState"
        :name="field"
        :aria-label="inputLabel || label"
        :aria-invalid="Boolean(error)"
        :aria-required="required"
        :aria-describedby="describedBy"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        placeholder-class="mobile-field__placeholder"
        :maxlength="maxlength"
        :disabled="disabled"
        :focus="focus"
      />
      <input
        v-else
        ref="control"
        :id="field"
        v-model="model"
        class="mobile-field__control"
        :class="[controlState, { 'mobile-field__control--numeric': type !== 'text' }]"
        :name="field"
        :aria-label="inputLabel || label"
        :aria-invalid="Boolean(error)"
        :aria-required="required"
        :aria-describedby="describedBy"
        :inputmode="inputmode"
        :type="type"
        :password="password"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        placeholder-class="mobile-field__placeholder"
        :maxlength="maxlength"
        :disabled="disabled"
        :focus="focus"
        @confirm="$emit('confirm')"
      />
    </slot>
    <text v-if="error" :id="`${field}-error`" class="mobile-field__error" role="alert">{{ error }}</text>
    <view v-if="hint || hasCount" class="mobile-field__details">
      <text v-if="hint" :id="`${field}-hint`" class="mobile-field__hint">{{ hint }}</text>
      <text v-if="hasCount" class="mobile-field__count">{{ model.length }}/{{ maxlength }}</text>
    </view>
  </view>
</template>

<style lang="scss">
@use '../styles/form';

.mobile-field { display: grid; gap: 7px; min-width: 0; }

.mobile-field__label {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--tms-text-strong, var(--smis-text-strong, #172033));
  font-size: max(26rpx, 14px);
  line-height: 1.4;
  font-weight: 650;
}

.mobile-field__required,
.mobile-field__error { color: var(--tms-red-strong, var(--smis-red-strong, #b42318)); }
.mobile-field__error { font-size: max(24rpx, 13px); line-height: 1.45; }
.mobile-field__details {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 12px;
  min-width: 0;
  color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-text-muted, #66738a)));
  font-size: max(22rpx, 12px);
  line-height: 1.45;
}
.mobile-field__hint { min-width: 0; overflow-wrap: anywhere; }
.mobile-field__count { margin-inline-start: auto; font-variant-numeric: tabular-nums; white-space: nowrap; }

.mobile-field__control {
  @include form.control;
  height: var(--tms-control-height, var(--smis-control-height, 44px));
}

.mobile-field__control--textarea {
  display: block;
  height: auto;
  min-height: 80px;
  padding-block: 10px;
}

.mobile-field__control--readonly {
  display: flex;
  align-items: center;
  height: auto;
  padding-block: 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.mobile-field__control--numeric { font-variant-numeric: tabular-nums; }
.mobile-field__control--error { @include form.error-border; }
.mobile-field__control:focus-within { @include form.focus; }
.mobile-field__control--disabled { opacity: .6; }
.mobile-field__placeholder { color: var(--tms-muted, var(--smis-muted, #66738a)); }
</style>
