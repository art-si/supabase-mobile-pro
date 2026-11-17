<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const props = defineProps<{ message: string; permissionDenied?: boolean }>()
const emit = defineEmits<{ 'permission-granted': [] }>()
const opening = ref(false)
const settingsError = ref(false)
const message = computed(() => settingsError.value ? '未能打开定位设置，请从小程序菜单进入设置' : props.message)

watch(() => props.message, () => { settingsError.value = false })

function openSettings() {
  // #ifdef MP-WEIXIN
  if (opening.value) return
  opening.value = true
  settingsError.value = false
  uni.openSetting({
    success({ authSetting }) {
      if (authSetting['scope.userLocation'] === true) emit('permission-granted')
    },
    fail() { settingsError.value = true },
    complete() { opening.value = false }
  })
  // #endif
}
</script>

<template>
  <view class="mobile-location-feedback">
    <view class="mobile-inline-pair mobile-inline-pair--start" role="status">
      <view class="mobile-inline-pair__icon" aria-hidden="true"><MobileIcon name="notice" size="16px" /></view>
      <text class="mobile-location-feedback__message">{{ message }}</text>
    </view>
    <!-- #ifdef MP-WEIXIN -->
    <button
      v-if="permissionDenied"
      class="mobile-action mobile-location-feedback__settings"
      :disabled="opening"
      :aria-busy="opening || undefined"
      hover-class="mobile-action--pressed"
      @click="openSettings"
    ><text>{{ opening ? '正在打开…' : '打开定位设置' }}</text></button>
    <!-- #endif -->
  </view>
</template>

<style scoped lang="scss">
.mobile-location-feedback {
  margin-block: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--tms-orange-soft, var(--smis-orange-soft, #fff3e4));
  color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text, #1f2937)));
  font-size: .875rem;
  line-height: 1.45;
}
.mobile-location-feedback__message { min-width: 0; overflow-wrap: anywhere; }
.mobile-location-feedback__settings {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-top: 4px;
  padding: 0 12px;
  border: 1px solid currentColor;
  border-radius: 10px;
  color: inherit;
  font-weight: 650;
  line-height: 1.3;
}
</style>
