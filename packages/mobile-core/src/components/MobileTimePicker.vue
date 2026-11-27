<script setup lang="ts">
import { ref, watch } from 'vue'
import MobileBottomSheet from './MobileBottomSheet.vue'
import MobileAction from './MobileAction.vue'
import MobileTimeWheel from './MobileTimeWheel.vue'

defineOptions({ options: { styleIsolation: 'apply-shared' } })
const props = defineProps<{ title: string; triggerId: string }>()
const value = defineModel<string>({ default: '' })
const visible = defineModel<boolean>('visible', { required: true })
const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const selection = ref([8, 0])
const wheelMounted = ref(false)
watch(visible, (open) => {
  if (!open) return
  selection.value = /^([01]\d|2[0-3]):[0-5]\d$/.test(value.value)
    ? value.value.split(':').map(Number) : [8, 0]
  wheelMounted.value = true
}, { immediate: true, flush: 'sync' })
function afterLeave() {
  if (!visible.value) wheelMounted.value = false
}
function confirm() {
  value.value = `${hours[selection.value[0] || 0]}:${minutes[selection.value[1] || 0]}`
  visible.value = false
}
</script>

<template>
  <MobileBottomSheet v-model="visible" :title="props.title" close-label="关闭时间选择"
    root-portal :z-index="180" :trigger-id="triggerId" :dialog-id="`${triggerId}-dialog`"
    @after-leave="afterLeave">
    <view class="mobile-time">
      <MobileTimeWheel v-if="wheelMounted" v-model="selection" />
    </view>
    <template #footer><view class="mobile-time__actions">
      <MobileAction class="secondary" @click="visible = false">取消</MobileAction>
      <MobileAction class="primary" @click="confirm">确定</MobileAction>
    </view></template>
  </MobileBottomSheet>
</template>

<style scoped>
.mobile-time { padding: 0 16px 12px; color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong))); }
.mobile-time__actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; padding-block: 12px; }
</style>
