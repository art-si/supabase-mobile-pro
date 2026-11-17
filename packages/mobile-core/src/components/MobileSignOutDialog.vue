<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MobileConfirmDialog from './MobileConfirmDialog.vue'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const visible = defineModel<boolean>({ required: true })
const props = defineProps<{ signOut: () => void | Promise<void>; demo?: boolean }>()
const busy = ref(false)
const failed = ref(false)
const title = computed(() => props.demo ? '退出演示' : '退出登录')
const message = computed(() => props.demo ? '返回登录页后可重新进入演示。' : '退出后需要重新登录才能继续使用。')

watch(visible, (open) => { if (open) failed.value = false })

async function confirm() {
  if (busy.value) return
  busy.value = true
  failed.value = false
  try {
    await props.signOut()
    visible.value = false
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <MobileConfirmDialog v-model="visible" :title="title" :message="message"
    :confirm-text="busy ? '正在退出…' : title" :busy="busy" keep-open-on-confirm @confirm="confirm">
    <text v-if="failed" class="mobile-sign-out__error" role="alert">没能退出，请重试。</text>
  </MobileConfirmDialog>
</template>

<style scoped lang="scss">
.mobile-sign-out__error {
  color: var(--tms-red-strong, var(--smis-red-strong));
  font-size: .875rem;
  line-height: 1.45;
}
</style>
