<script setup lang="ts">
import { ref } from 'vue'
import MobileIcon from './MobileIcon.vue'
import { wechatPhoneCode, wechatPhoneLoginError, type WechatPhoneEvent } from '../wechat-phone-login'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })
const props = defineProps<{ bindPhone: (code: string) => Promise<void> }>()
const busy = ref(false)
const bound = ref(false)
const error = ref('')

async function bind(event?: WechatPhoneEvent) {
  if (busy.value) return
  error.value = ''
  const code = wechatPhoneCode(event)
  if (!code) {
    error.value = '未取得手机号授权，请重新授权。'
    return
  }
  busy.value = true
  try {
    await props.bindPhone(code)
    bound.value = true
  } catch (cause) {
    error.value = wechatPhoneLoginError(cause)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <button class="mobile-action mobile-row mobile-phone-binding" open-type="getPhoneNumber"
    :disabled="busy" :aria-busy="busy || undefined" hover-class="mobile-action--pressed" @getphonenumber="bind">
    <view class="mobile-row__icon" aria-hidden="true"><MobileIcon name="mobile" size="17px" /></view>
    <view class="mobile-row__body">
      <text class="mobile-row__label">{{ busy ? '正在绑定…' : bound ? '更新微信手机号绑定' : '绑定微信手机号' }}</text>
      <text v-if="error" class="mobile-row__detail mobile-phone-binding__error" role="alert">{{ error }}</text>
      <text v-else class="mobile-row__detail" role="status">{{ bound ? '绑定成功，下次可使用手机一键登录' : '绑定后可使用手机一键登录' }}</text>
    </view>
    <MobileIcon container-class="mobile-row__chevron" name="chevron" size="14px" />
  </button>
  <!-- #endif -->
</template>

<style scoped lang="scss">
.mobile-phone-binding__error {
  color: var(--tms-red-strong, var(--smis-red-strong));
}
</style>
