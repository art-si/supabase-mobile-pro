<script setup lang="ts">
import { computed, nextTick, ref, watchPostEffect } from 'vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import { nativeFieldOf, useNativeFieldAttributes } from '../form-focus'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { styleIsolation: 'shared' } })

const props = withDefaults(defineProps<{
  modelValue: string
  name: string
  label: string
  placeholder: string
  maxlength?: number
  actionLabel?: string
  disabled?: boolean
  compactAction?: boolean
  fitKeyboard?: boolean
}>(), { maxlength: 64, actionLabel: '搜索' })
const emit = defineEmits<{ 'update:modelValue': [value: string]; submit: []; clear: []; keyboard: [height: number] }>()
const field = useNativeFieldAttributes(() => ({
  'aria-label': props.label,
  'aria-disabled': props.disabled ? 'true' : undefined,
  name: props.name
}))
const text = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})
const inputVersion = ref(0)

async function clear() {
  if (props.disabled) return
  text.value = ''
  // #ifdef H5
  // Uni can replay its debounced previous value on focus. Start with a fresh input state.
  inputVersion.value++
  // #endif
  emit('clear')
  // #ifdef H5
  await nextTick()
  nativeFieldOf(field.value)?.focus({ preventScroll: true })
  // #endif
}

function submit(value = text.value) {
  if (props.disabled || !props.actionLabel) return
  if (value !== text.value) text.value = value
  emit('submit')
}

function submitAction() {
  // #ifdef H5
  submit(nativeFieldOf(field.value)?.value)
  // #endif
  // #ifndef H5
  submit()
  // #endif
}

function confirm(event: { detail: { value: string } }) {
  // #ifndef H5
  submit(event.detail.value)
  // #endif
}

// #ifdef H5
watchPostEffect(cleanup => {
  const input = nativeFieldOf(field.value)
  if (!input) return
  let started = false
  const composing = (event: KeyboardEvent) => event.isComposing || event.keyCode === 229
  const onDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') return
    if (!event.repeat) started = !composing(event)
    // Leave the key's default action to the IME while choosing or finalizing a candidate.
    if (!composing(event)) event.preventDefault()
  }
  const onUp = (event: Event) => {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') return
    event.stopImmediatePropagation()
    const shouldSubmit = started && !composing(event)
    started = false
    if (!shouldSubmit) return
    event.preventDefault()
    submit(input.value)
  }
  const onBlur = () => { started = false }
  input.addEventListener('keydown', onDown, true)
  input.addEventListener('keyup', onUp, true)
  input.addEventListener('blur', onBlur)
  cleanup(() => {
    input.removeEventListener('keydown', onDown, true)
    input.removeEventListener('keyup', onUp, true)
    input.removeEventListener('blur', onBlur)
  })
})
// #endif

function reportKeyboard(event?: FocusEvent | { detail: { height?: number } }) {
  const detail = event?.detail
  if (props.fitKeyboard) emit('keyboard', typeof detail === 'object' ? detail.height ?? 0 : 0)
}
</script>

<template>
  <view class="mobile-search" :class="{ 'mobile-search--with-action': actionLabel }" role="search">
    <view class="mobile-search__entry">
    <MobileIcon class="mobile-search__icon" name="search" size="31rpx" aria-hidden="true" />
    <input
      :key="inputVersion"
      ref="field"
      v-model="text"
      class="mobile-search__field"
      :class="{ 'mobile-search__field--disabled': disabled }"
      :name="name"
      :aria-label="label"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      autocomplete="off"
      confirm-type="search"
      :adjust-position="!fitKeyboard"
      @confirm="confirm"
      @focus="reportKeyboard" @blur="reportKeyboard()" @keyboardheightchange="reportKeyboard"
    />
    <MobileAction v-if="text" variant="icon" class="mobile-search__clear" aria-label="清除搜索" :disabled="disabled" @click="clear">
      <MobileIcon name="close" size="30rpx" aria-hidden="true" />
    </MobileAction>
    </view>
    <button
      v-if="actionLabel"
      class="mobile-action mobile-search__submit"
      :class="{ 'mobile-search__submit--compact': compactAction }"
      :disabled="disabled"
      :aria-disabled="disabled || undefined" :tabindex="disabled ? -1 : 0" role="button"
      hover-class="mobile-action--pressed" @click="submitAction"
      @keydown="preventActionKey" @keyup="activateActionKey($event, submitAction)"
    ><text class="mobile-search__action-label">{{ actionLabel }}</text></button>
  </view>
</template>

<style scoped lang="scss">
.mobile-search {
  --mobile-search-ink: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong)));
  --mobile-search-muted: var(--mobile-workspace-muted, var(--tms-text-secondary, var(--smis-text-secondary)));
  --mobile-search-accent: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  --mobile-search-height: var(--mobile-workspace-action-height, max(44px, 84rpx));
  display: grid;
  align-items: center;
  min-width: 0;
  background: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface)));
  border: 1px solid var(--mobile-workspace-line, var(--tms-line-subtle, var(--smis-line-subtle)));
  border-radius: 14px;
}

.mobile-search--with-action {
  // Size the input from the containing panel and font size; move the action to its own row when needed.
  display: flex;
  flex-wrap: wrap;
}
.mobile-search__entry {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 min(100%, 9rem);
}

.mobile-search:focus-within {
  outline: 2px solid var(--mobile-workspace-focus, var(--mobile-search-accent));
  outline-offset: 2px;
}

.mobile-search__icon { flex: none; margin-inline-start: 12px; color: var(--mobile-search-muted); }

.mobile-search__field {
  flex: 1;
  min-width: 0;
  min-height: var(--mobile-search-height);
  padding-inline: 8px;
  color: var(--mobile-search-ink);
  font-size: max(16px, 1rem);
}
.mobile-search__field--disabled { opacity: .65; }

.mobile-search .mobile-search__submit {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: var(--mobile-search-height);
  padding-inline: 8px;
  margin-inline-start: auto;
  color: var(--mobile-search-accent);
  font-size: max(24rpx, 13px, .8125rem);
  font-weight: 650;
  white-space: nowrap;
}

.mobile-search .mobile-search__clear {
  min-height: var(--mobile-search-height);
  color: var(--mobile-search-muted);
}
.mobile-search .mobile-search__submit { padding-inline-end: 11px; }

.mobile-search .mobile-search__submit--compact { padding-inline: 4px; }
.mobile-search__submit--compact .mobile-search__action-label {
  display: grid;
  place-items: center;
  min-width: 54px;
  height: 32px;
  padding-inline: 8px;
  border-radius: 8px;
  color: #fff;
  background: var(--mobile-search-accent);
}
</style>
