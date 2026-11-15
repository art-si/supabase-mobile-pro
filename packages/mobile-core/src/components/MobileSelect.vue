<script setup lang="ts">
import { computed, getCurrentInstance, inject, ref } from 'vue'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'
import { systemInsetsKey } from '../system-insets'

const props = defineProps<{
  options: readonly { id: string; name: string }[]
  label: string
  placeholder: string
  field?: string
  compact?: boolean
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}>()
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ select: [id: string] }>()
const uid = getCurrentInstance()?.uid
const triggerId = computed(() => props.field || `mobile-select-${uid}`)
const dialogId = computed(() => `${triggerId.value}-options`)
const systemInsets = inject(systemInsetsKey)
const popupStyle = computed(() => {
  const bottom = systemInsets?.value['--mobile-safe-bottom'] ?? 'var(--mobile-safe-bottom, 0px)'
  return `width:100%;max-width:560px;margin-inline:auto;border-radius:22px 22px 0 0;padding-bottom:${bottom};`
})
const visible = ref(false)
const query = ref('')
const searchEnabled = computed(() => props.options.length > 8)
const displayValue = computed(() => !props.compact && props.options.find((option) => option.id === model.value)?.name)
const choices = computed(() => {
  const search = query.value.trim().toLowerCase()
  return search ? props.options.filter((option) => option.name.toLowerCase().includes(search)) : props.options
})

function open() {
  query.value = ''
  visible.value = true
}

function choose(value: string) {
  if (!props.compact) model.value = value
  emit('select', value)
  visible.value = false
}

function focusDialog() {
  // #ifdef H5
  if (!visible.value) return
  const dialog = document.getElementById(dialogId.value)
  const selected = dialog?.querySelector<HTMLElement>('[aria-pressed="true"]')
  const close = dialog?.querySelector<HTMLElement>('.mobile-select__close')
  const target = selected || close
  target?.focus()
  // #endif
}

function focusTrigger() {
  // #ifdef H5
  if (!visible.value) document.getElementById(triggerId.value)?.focus({ preventScroll: true })
  // #endif
}

function handleKeydown(event: KeyboardEvent) {
  // #ifdef H5
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    visible.value = false
    return
  }
  if (event.key !== 'Tab') return
  const items = document.getElementById(dialogId.value)?.querySelectorAll<HTMLElement>('input, [tabindex="0"]')
  if (!items?.length) return
  const first = items.item(0)
  const last = items.item(items.length - 1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
  // #endif
}
</script>

<template>
  <view class="mobile-select" :class="{ 'mobile-select--compact': compact }">
    <MobileAction
      :id="triggerId" class="mobile-select__control"
      :class="{ 'mobile-select__control--invalid': invalid, 'mobile-select__control--placeholder': !displayValue && !compact }"
      :disabled="disabled" :aria-label="label" :aria-invalid="invalid || undefined" :aria-describedby="describedBy"
      aria-haspopup="dialog" :aria-expanded="visible" :aria-controls="visible ? dialogId : undefined"
      @click="open"
    >
      <text>{{ displayValue || placeholder }}</text>
      <MobileIcon name="chevron" size="12px" class="mobile-select__chevron" />
    </MobileAction>

    <wd-popup
      v-model="visible" position="bottom" :z-index="180" round root-portal
      :custom-style="popupStyle"
      modal-style="background:rgba(15,23,42,.42);"
      @after-enter="focusDialog" @after-leave="focusTrigger"
    >
      <view :id="dialogId" class="mobile-select__dialog" role="dialog" aria-modal="true" :aria-label="label" @keydown="handleKeydown($event)">
        <view class="mobile-select__head">
          <text class="mobile-select__title">{{ label }}</text>
          <MobileAction class="mobile-select__close" aria-label="关闭选择" @click="visible = false">
            <MobileIcon name="close" size="20px" />
          </MobileAction>
        </view>

        <wd-search v-if="searchEnabled" v-model="query" placeholder="搜索选项" hide-cancel placeholder-left />
        <scroll-view
          scroll-y class="mobile-select__options"
          :style="{ '--mobile-select-list-height': `${Math.max(choices.length, 1) * 52}px` }"
        >
          <MobileAction
            v-for="choice in choices" :key="choice.id" class="mobile-select__option"
            :class="{ 'mobile-select__option--selected': !compact && choice.id === model }"
            :aria-pressed="!compact && choice.id === model" @click="choose(choice.id)"
          >
            <text>{{ choice.name }}</text>
            <MobileIcon v-if="!compact && choice.id === model" name="check" size="20px" />
          </MobileAction>
          <text v-if="!choices.length" class="mobile-select__empty">{{ query ? '没有匹配的选项' : '暂无可选项' }}</text>
        </scroll-view>
      </view>
    </wd-popup>
  </view>
</template>

<style scoped lang="scss">
@use '../styles/form';

.mobile-select { min-width: 0; }

.mobile-select__control {
  @include form.control;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: start;
}
.mobile-select__control:focus-visible { @include form.focus; }
.mobile-select__control--invalid { @include form.error-border; }
.mobile-select__control--placeholder { color: var(--tms-muted, var(--smis-muted, #66738a)); }
.mobile-select__control text { min-width: 0; overflow-wrap: anywhere; }
.mobile-select__chevron { flex: none; pointer-events: none; transform: rotate(90deg); }

.mobile-select--compact { width: fit-content; max-width: 100%; }
.mobile-select--compact .mobile-select__control {
  padding-inline: 10px;
  border-color: transparent;
  background: var(--tms-primary-soft, var(--smis-primary-soft, #e8f5f0));
  color: var(--tms-primary, var(--smis-primary, #0f766e));
  font-size: max(24rpx, 13px);
  font-weight: 650;
}

.mobile-select__dialog {
  padding: 0 16px 12px;
  color: var(--tms-text-strong, var(--smis-text-strong, #172033));
  font-family: var(--tms-font-family, var(--smis-font-family, sans-serif));
}

.mobile-select__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 60px;
}

.mobile-select__title { min-width: 0; font-size: 18px; font-weight: 700; line-height: 1.35; }
.mobile-select__close { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; }

.mobile-select__options {
  height: min(var(--mobile-select-list-height), 52vh, 364px);
  max-width: 100%;
}

.mobile-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  width: 100%;
  padding: 10px 12px;
  border-top: 1px solid var(--tms-line-subtle, var(--smis-line-subtle));
  font-size: 16px;
  line-height: 1.35;
  text-align: start;
  white-space: normal;
  overflow-wrap: anywhere;
}

.mobile-select__option--selected {
  border-radius: 10px;
  color: var(--tms-primary-strong, var(--smis-primary-strong));
  background: var(--tms-primary-soft, var(--smis-primary-soft));
  font-weight: 650;
}

.mobile-select__option:focus-visible { outline-offset: -3px; }
.mobile-select__empty { display: block; padding: 12px; color: var(--tms-muted, var(--smis-muted)); }
</style>
