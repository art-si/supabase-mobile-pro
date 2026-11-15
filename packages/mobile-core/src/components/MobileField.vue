<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  field: string
  label: string
  inputLabel?: string
  placeholder?: string
  maxlength?: number
  error?: string
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

const type = computed(() => {
  if (props.inputmode === 'numeric') return 'number'
  if (props.inputmode === 'decimal') return 'digit'
  return 'text'
})
</script>

<template>
  <view class="mobile-field">
    <label class="mobile-field__label" :for="field">
      {{ label }}
      <text v-if="required" class="mobile-field__required" aria-hidden="true">*</text>
    </label>
    <slot>
      <text v-if="readonly" class="mobile-field__control mobile-field__control--readonly" :id="field">
        {{ model || '—' }}
      </text>
      <textarea
        v-else-if="multiline"
        :id="field"
        v-model="model"
        class="mobile-field__control mobile-field__control--textarea"
        :class="{ 'mobile-field__control--error': error }"
        :name="field"
        :aria-label="inputLabel || label"
        :aria-invalid="Boolean(error)"
        :aria-required="required"
        :aria-describedby="error ? `${field}-error` : undefined"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        placeholder-class="mobile-field__placeholder"
        :maxlength="maxlength"
        :disabled="disabled"
        :focus="focus"
      />
      <input
        v-else
        :id="field"
        v-model="model"
        class="mobile-field__control"
        :class="{ 'mobile-field__control--error': error, 'mobile-field__control--numeric': type !== 'text' }"
        :name="field"
        :aria-label="inputLabel || label"
        :aria-invalid="Boolean(error)"
        :aria-required="required"
        :aria-describedby="error ? `${field}-error` : undefined"
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
.mobile-field__control[disabled] { opacity: .6; }
.mobile-field__placeholder { color: var(--tms-muted, var(--smis-muted, #66738a)); }
</style>
