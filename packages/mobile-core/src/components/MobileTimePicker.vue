<script setup lang="ts">
import { ref, watch } from 'vue'
import MobileBottomSheet from './MobileBottomSheet.vue'
import MobileAction from './MobileAction.vue'

defineOptions({ options: { styleIsolation: 'apply-shared' } })
const props = defineProps<{ title: string; triggerId: string }>()
const value = defineModel<string>({ default: '' })
const visible = defineModel<boolean>('visible', { required: true })
const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const selection = ref([8, 0])
watch(visible, (open) => {
  if (open) selection.value = /^([01]\d|2[0-3]):[0-5]\d$/.test(value.value)
    ? value.value.split(':').map(Number) : [8, 0]
}, { flush: 'sync' })
function change(event: { detail: { value: number[] } }) {
  selection.value = event.detail.value
}
function key(event: KeyboardEvent, column: number) {
  const max = column === 0 ? 23 : 59
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const next = [...selection.value]
  next[column] = event.key === 'Home' ? 0 : event.key === 'End' ? max
    : ((next[column] || 0) + (event.key === 'ArrowUp' ? -1 : 1) + max + 1) % (max + 1)
  selection.value = next
}
function confirm() {
  value.value = `${hours[selection.value[0] || 0]}:${minutes[selection.value[1] || 0]}`
  visible.value = false
}
</script>

<template>
  <MobileBottomSheet v-model="visible" :title="props.title" close-label="关闭时间选择"
    root-portal :z-index="180" :trigger-id="triggerId" :dialog-id="`${triggerId}-dialog`">
    <view class="mobile-time">
      <view class="mobile-time__labels" aria-hidden="true"><text>小时</text><text>分钟</text></view>
      <picker-view v-if="visible" class="mobile-time__wheel" :value="selection" @change="change"
        indicator-style="height:48px;box-shadow:inset 0 1px var(--mobile-workspace-line),inset 0 -1px var(--mobile-workspace-line);"
        mask-style="background-image:none;">
        <picker-view-column role="spinbutton" aria-label="小时" :aria-valuenow="selection[0]" :aria-valuemin="0" :aria-valuemax="23"
          tabindex="0" @keydown="key($event, 0)">
          <view v-for="(hour, index) in hours" :key="hour" class="mobile-time__option" :class="{ 'mobile-time__option--selected': index === selection[0] }">{{ hour }}</view>
        </picker-view-column>
        <picker-view-column role="spinbutton" aria-label="分钟" :aria-valuenow="selection[1]" :aria-valuemin="0" :aria-valuemax="59"
          tabindex="0" @keydown="key($event, 1)">
          <view v-for="(minute, index) in minutes" :key="minute" class="mobile-time__option" :class="{ 'mobile-time__option--selected': index === selection[1] }">{{ minute }}</view>
        </picker-view-column>
      </picker-view>
    </view>
    <template #footer><view class="mobile-time__actions">
      <MobileAction class="secondary" @click="visible = false">取消</MobileAction>
      <MobileAction class="primary" @click="confirm">确定</MobileAction>
    </view></template>
  </MobileBottomSheet>
</template>

<style scoped>
.mobile-time { padding: 0 16px 12px; color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong))); }
.mobile-time__labels { display: grid; grid-template-columns: 1fr 1fr; text-align: center; padding-block: 8px; color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted))); font-size: 0.875rem; }
.mobile-time__wheel { height: 240px; font-size: max(18px, 1.125rem); background: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface))); }
.mobile-time__option { display: flex; justify-content: center; align-items: center; height: 48px; font-variant-numeric: tabular-nums; }
.mobile-time__option--selected { color: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary))); font-weight: 700; }
.mobile-time__wheel :deep(uni-picker-view-column:focus-visible) { outline: 3px solid var(--mobile-workspace-accent); outline-offset: -3px; border-radius: 10px; }
.mobile-time__actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; padding-block: 12px; }
</style>
