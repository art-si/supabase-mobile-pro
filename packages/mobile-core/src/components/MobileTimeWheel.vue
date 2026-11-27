<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

defineProps<{ compact?: boolean }>()
const selection = defineModel<number[]>({ required: true })
const pickerValue = ref([0, 0])
const visualReady = ref(false)
const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))
let ready = false
let disposed = false
let activeColumn: 0 | 1 | undefined
let applyingPickerChange = false

// Uni's H5 picker measures its scrolling bounds during mount. Apply the
// initial position after layout so the last hours/minutes can be centered.
onMounted(async () => {
  await nextTick()
  // #ifdef H5
  await new Promise<void>(resolve => setTimeout(resolve, 100))
  if (disposed) return
  // Change the index once after the picker has measured its padding, then
  // position it on the chosen value using the settled scroll bounds.
  pickerValue.value = [(selection.value[0] + 1) % 24, (selection.value[1] + 1) % 60]
  await nextTick()
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  // #endif
  if (disposed) return
  pickerValue.value = [...selection.value]
  await nextTick()
  // #ifdef H5
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  // #endif
  if (disposed) return
  ready = true
  visualReady.value = true
})
watch(selection, value => {
  if (!ready) return
  if (!applyingPickerChange) activeColumn = undefined
  pickerValue.value = [...value]
}, { flush: 'sync' })

onBeforeUnmount(() => { disposed = true })

function change(event: { detail: { value: number[] } }) {
  if (!ready) return
  // #ifdef H5
  if (activeColumn === undefined) return
  // #endif
  const [hour, minute] = event.detail.value
  if (Number.isInteger(hour) && hour >= 0 && hour < 24 && Number.isInteger(minute) && minute >= 0 && minute < 60) {
    applyingPickerChange = true
    try { selection.value = [hour, minute] }
    finally { applyingPickerChange = false }
  }
}

function key(event: KeyboardEvent, column: number) {
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  activeColumn = undefined
  const max = column === 0 ? 23 : 59
  const next = [...selection.value]
  next[column] = event.key === 'Home' ? 0 : event.key === 'End' ? max
    : ((next[column] || 0) + (event.key === 'ArrowUp' ? -1 : 1) + max + 1) % (max + 1)
  selection.value = next
}
</script>

<template>
  <view class="mobile-time-wheel" :class="{ 'mobile-time-wheel--compact': compact, 'mobile-time-wheel--initializing': !visualReady }">
    <view class="mobile-time-wheel__labels" aria-hidden="true"><text>小时</text><text>分钟</text></view>
    <picker-view class="mobile-time__wheel mobile-time-wheel__picker" :value="pickerValue" @change="change"
      :indicator-style="`height:${compact ? 44 : 48}px;box-shadow:inset 0 1px var(--mobile-workspace-line),inset 0 -1px var(--mobile-workspace-line);`"
      mask-style="background-image:none;">
      <picker-view-column role="spinbutton" aria-label="小时" :aria-valuenow="selection[0]" :aria-valuemin="0" :aria-valuemax="23"
        tabindex="0" @keydown="key($event, 0)" @touchstart="activeColumn = 0" @mousedown="activeColumn = 0" @wheel="activeColumn = 0">
        <view v-for="(hour, index) in hours" :key="hour" class="mobile-time__option mobile-time-wheel__option" :class="{ 'mobile-time__option--selected': index === selection[0], 'mobile-time-wheel__option--selected': index === selection[0] }">{{ hour }}</view>
      </picker-view-column>
      <picker-view-column role="spinbutton" aria-label="分钟" :aria-valuenow="selection[1]" :aria-valuemin="0" :aria-valuemax="59"
        tabindex="0" @keydown="key($event, 1)" @touchstart="activeColumn = 1" @mousedown="activeColumn = 1" @wheel="activeColumn = 1">
        <view v-for="(minute, index) in minutes" :key="minute" class="mobile-time__option mobile-time-wheel__option" :class="{ 'mobile-time__option--selected': index === selection[1], 'mobile-time-wheel__option--selected': index === selection[1] }">{{ minute }}</view>
      </picker-view-column>
    </picker-view>
  </view>
</template>

<style scoped>
.mobile-time-wheel { --mobile-time-row-height: 48px; color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong))); }
.mobile-time-wheel--initializing { visibility: hidden; }
.mobile-time-wheel--compact { --mobile-time-row-height: 44px; }
.mobile-time-wheel__labels { display: grid; grid-template-columns: 1fr 1fr; text-align: center; padding-block: 6px; color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted))); font-size: .875rem; }
.mobile-time-wheel__picker { height: 240px; font-size: max(18px, 1.125rem); background: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface))); }
.mobile-time-wheel--compact .mobile-time-wheel__picker { height: 132px; }
.mobile-time-wheel__option { display: flex; justify-content: center; align-items: center; height: var(--mobile-time-row-height); font-variant-numeric: tabular-nums; }
.mobile-time-wheel__option--selected { color: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary))); font-weight: 700; }
.mobile-time-wheel__picker :deep(uni-picker-view-column:focus-visible) { outline: 3px solid var(--mobile-workspace-accent); outline-offset: -3px; border-radius: 10px; }
</style>
