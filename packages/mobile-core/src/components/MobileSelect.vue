<script setup lang="ts">
import { computed, getCurrentInstance, inject, ref, watch } from 'vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import MobileIcon from './MobileIcon.vue'
import MobilePickerTrigger from './MobilePickerTrigger.vue'
import MobileSearch from './MobileSearch.vue'
import { useOverlayFocus } from '../overlay-focus'
import { systemInsetsKey } from '../system-insets'

defineOptions({ options: { styleIsolation: 'shared' } })

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
const instance = getCurrentInstance()
const uid = instance?.uid
const triggerId = computed(() => props.field || `mobile-select-${uid}`)
const dialogId = computed(() => `${triggerId.value}-options`)
const optionListId = computed(() => `${dialogId.value}-list`)
const systemInsets = inject(systemInsetsKey)
const popupStyle = computed(() => {
  const bottom = systemInsets?.value['--mobile-safe-bottom'] ?? 'var(--mobile-safe-bottom, 0px)'
  return `width:100%;max-width:var(--mobile-workspace-max-width, 560px);margin-inline:auto;border-radius:22px 22px 0 0;padding-bottom:${bottom};`
})
const visible = ref(false)
const panel = ref<HTMLElement | { $el: HTMLElement }>()
const query = ref('')
const measuredHeight = ref<number>()
const searchEnabled = computed(() => props.options.length > 8)
const displayValue = computed(() => props.compact ? undefined : props.options.find((option) => option.id === model.value)?.name)
const choices = computed(() => {
  const search = query.value.trim().toLowerCase()
  return search ? props.options.filter((option) => option.name.toLowerCase().includes(search)) : props.options
})
const optionHeight = computed(() => measuredHeight.value ?? Math.max(choices.value.length, 1) * 52)

function measureOptions() {
  if (!visible.value) return
  const currentChoices = choices.value
  const applySize = (height?: number) => {
    if (visible.value && choices.value === currentChoices && height && height > 0) {
      measuredHeight.value = Math.ceil(height)
    }
  }
  // #ifdef H5
  applySize(document.getElementById(optionListId.value)?.getBoundingClientRect().height)
  // #endif
  // #ifndef H5
  if (!instance?.proxy) return
  uni.createSelectorQuery().in(instance.proxy).select('.mobile-select__option-list').boundingClientRect((rect) => {
    if (rect && !Array.isArray(rect)) applySize(rect.height)
  }).exec()
  // #endif
}

watch([visible, choices], measureOptions, { flush: 'post' })
useOverlayFocus(visible, {
  panel: () => panel.value,
  initial: '.mobile-select__option--selected',
  cancel: () => { visible.value = false },
  trigger: () => {
    // #ifdef H5
    return document.getElementById(triggerId.value)
    // #endif
    return null
  }
})

function open() {
  query.value = ''
  measuredHeight.value = undefined
  visible.value = true
}

function choose(value: string) {
  if (!props.compact) model.value = value
  emit('select', value)
  visible.value = false
}

function close() { visible.value = false }

</script>

<template>
  <view class="mobile-select" :class="{ 'mobile-select--compact': compact }">
    <MobilePickerTrigger
      :id="triggerId" class="mobile-select__control"
      :value="displayValue" :placeholder="placeholder" :compact="compact" :expanded="visible"
      :disabled="disabled" :label="label" :invalid="invalid" :described-by="describedBy"
      :description="displayValue ? `当前选项：${displayValue}` : undefined"
      :aria-controls="visible ? dialogId : undefined"
      @click="open"
    />

    <wd-popup
      v-model="visible" position="bottom" :z-index="180" round root-portal
      :custom-style="popupStyle"
      modal-style="background:rgba(15,23,42,.42);"
      @after-enter="measureOptions"
    >
      <view :id="dialogId" ref="panel" class="mobile-select__dialog" tabindex="-1" role="dialog" aria-modal="true" :aria-label="label">
        <view class="mobile-select__head">
          <text class="mobile-select__title" role="heading" aria-level="2">{{ label }}</text>
          <button class="mobile-action mobile-action--icon mobile-select__close" role="button" tabindex="0" aria-label="关闭选择"
            hover-class="mobile-action--pressed" @click="close"
            @keydown="preventActionKey" @keyup="activateActionKey($event, close)">
            <MobileIcon name="close" size="20px" aria-hidden="true" />
          </button>
        </view>

        <MobileSearch
          v-if="searchEnabled"
          v-model="query"
          class="mobile-select__search"
          :name="`${triggerId}-query`"
          :label="`搜索${label}的选项`"
          placeholder="搜索选项…"
          action-label=""
        />
        <scroll-view
          scroll-y class="mobile-select__options"
          :style="{ '--mobile-select-list-height': `${optionHeight}px` }"
        >
          <view :id="optionListId" class="mobile-select__option-list">
            <button
              v-for="choice in choices" :key="choice.id" class="mobile-action mobile-select__option"
              :class="{ 'mobile-select__option--selected': !compact && choice.id === model }"
              role="button" tabindex="0" :aria-pressed="!compact && choice.id === model"
              hover-class="mobile-action--pressed" @click="choose(choice.id)"
              @keydown="preventActionKey" @keyup="activateActionKey($event, () => choose(choice.id))"
            >
              <text>{{ choice.name }}</text>
              <MobileIcon v-if="!compact && choice.id === model" name="check" size="20px" aria-hidden="true" />
            </button>
            <text v-if="!choices.length" class="mobile-select__empty" role="status">{{ query ? '没有匹配的选项' : '暂无可选项' }}</text>
          </view>
        </scroll-view>
      </view>
    </wd-popup>
  </view>
</template>

<style scoped lang="scss">
.mobile-select { min-width: 0; }
.mobile-select--compact { width: fit-content; max-width: 100%; }

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
.mobile-select__close { border-radius: 50%; }
.mobile-select__search { margin-bottom: 8px; }

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
