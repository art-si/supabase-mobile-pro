<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import { nativeFieldOf, useNativeFieldAttributes } from '../form-focus'
import { useSystemInsets } from '../system-insets'
import { wechatPhoneCode, type WechatPhoneEvent } from '../wechat-phone-login'

defineOptions({ options: { styleIsolation: 'apply-shared' } })

interface LoginBrand {
  name: string
  badge: string
  eyebrow: string
  title: string
  description: string
  benefits: readonly string[]
}

const props = withDefaults(defineProps<{
  themeName: string
  themeScope?: 'tms' | 'smis'
  brand: LoginBrand
  accountLabel: string
  accountPlaceholder: string
  accountHint: string
  rememberKey: string
  helpText: string
  forgotPasswordText: string
  authenticate: (account: string, password: string) => Promise<void>
  explainError: (error: unknown, channel?: 'phone') => string
  validateAccount?: (account: string) => string
  authenticatePhone?: (code: string) => Promise<void>
  demo?: () => void
  notice?: string
}>(), { themeScope: 'tms' })
const emit = defineEmits<{ success: [] }>()
const systemInsets = useSystemInsets()

const account = ref('')
const password = ref('')
const passwordVisible = ref(false)
const remember = ref(true)
const loading = ref(false)
const phoneLoading = ref(false)
const phoneError = ref('')
const accountError = ref('')
const passwordError = ref('')
const loginError = ref('')
type LoginField = 'account' | 'password'
const focusField = ref<LoginField | ''>('')
const fieldIds = { account: 'mobile-login-account', password: 'mobile-login-password' }
const accountDescription = computed(() => accountError.value ? 'mobile-login-hint mobile-login-account-error' : 'mobile-login-hint')
const passwordDescription = computed(() => passwordError.value ? 'mobile-login-password-error' : undefined)
const accountControl = useNativeFieldAttributes(() => ({
  id: labelTarget('account'),
  name: 'username',
  'aria-label': props.accountLabel,
  'aria-invalid': accountError.value ? 'true' : undefined,
  'aria-required': 'true',
  'aria-describedby': accountDescription.value,
  autocomplete: 'username',
  autocapitalize: 'off',
  spellcheck: 'false'
}))
const passwordControl = useNativeFieldAttributes(() => ({
  id: labelTarget('password'),
  name: 'password',
  'aria-label': '登录密码',
  'aria-invalid': passwordError.value ? 'true' : undefined,
  'aria-required': 'true',
  'aria-describedby': passwordDescription.value,
  autocomplete: 'current-password'
}))

const themeTokens = [
  'primary-rgb',
  'primary-soft',
  'bg',
  'primary',
  'primary-bright',
  'text-strong',
  'text-secondary',
  'muted',
  'material-regular',
  'shadow-floating',
  'green-strong',
  'green-soft',
  'line',
  'apple-duration-fast',
  'apple-ease',
  'red-strong',
  'primary-deep',
  'shadow-primary',
  'light',
  'surface',
]
const themeVariables = computed(() => Object.fromEntries(themeTokens.map((token) => [
  '--login-' + token, 'var(--' + props.themeScope + '-' + token + ')'
])))

watch(account, () => { accountError.value = ''; loginError.value = '' })
watch(password, () => { passwordError.value = ''; loginError.value = '' })

function labelTarget(field: LoginField) {
  // #ifdef H5
  return fieldIds[field] + '-input'
  // #endif
  return fieldIds[field]
}

function focusInput(field: LoginField) {
  if (loading.value) return
  focusField.value = field
  // #ifdef H5
  nativeFieldOf(field === 'account' ? accountControl.value : passwordControl.value)?.focus()
  // #endif
}

function blurInput(field: LoginField) {
  if (focusField.value === field) focusField.value = ''
}

function clearAccount() {
  if (loading.value) return
  account.value = ''
  focusInput('account')
}

function togglePassword() {
  if (!loading.value) passwordVisible.value = !passwordVisible.value
}

onMounted(() => {
  try {
    const cached: unknown = uni.getStorageSync(props.rememberKey)
    if (typeof cached === 'string') account.value = cached
  } catch {
    // The login form remains usable when the device disables local storage.
  }
})

function saveAccount(value: string) {
  try {
    if (remember.value) uni.setStorageSync(props.rememberKey, value)
    else uni.removeStorageSync(props.rememberKey)
  } catch {
    uni.showToast({ title: '当前设备无法保存账号', icon: 'none' })
  }
}

async function submit() {
  if (loading.value || phoneLoading.value) return
  let identifier = account.value
  let secret = password.value
  // #ifdef H5
  // Uni's H5 input sync is throttled. Use the visible text on immediate submit/autofill.
  identifier = nativeFieldOf(accountControl.value)?.value ?? identifier
  secret = nativeFieldOf(passwordControl.value)?.value ?? secret
  // #endif
  const value = identifier.trim()
  accountError.value = value ? (props.validateAccount?.(value) ?? '') : '请输入' + props.accountLabel
  passwordError.value = secret ? '' : '请输入登录密码'
  loginError.value = ''
  focusField.value = ''
  if (accountError.value || passwordError.value) {
    await nextTick()
    focusInput(accountError.value ? 'account' : 'password')
    return
  }
  loading.value = true
  try {
    await props.authenticate(value, secret)
    saveAccount(value)
    password.value = ''
    passwordVisible.value = false
    emit('success')
  } catch (error) {
    loginError.value = props.explainError(error)
  } finally {
    loading.value = false
  }
}

// #ifdef MP-WEIXIN
async function phoneLogin(event?: WechatPhoneEvent) {
  if (!props.authenticatePhone || phoneLoading.value || loading.value) return
  const code = wechatPhoneCode(event)
  if (!code) {
    phoneError.value = '未取得手机号授权，可以重试或用账号密码登录。'
    return
  }
  phoneError.value = ''
  phoneLoading.value = true
  try {
    await props.authenticatePhone(code)
    password.value = ''
    passwordVisible.value = false
    emit('success')
  } catch (error) {
    phoneError.value = props.explainError(error, 'phone')
  } finally {
    phoneLoading.value = false
  }
}
// #endif

function forgotPassword() {
  uni.showToast({ title: props.forgotPasswordText, icon: 'none' })
}
</script>

<template>
<wd-config-provider :theme="themeName">
  <view class="login-page page" :style="[themeVariables, systemInsets]">
    <view class="login-page__orb login-page__orb--one" />
    <view class="login-page__orb login-page__orb--two" />
    <view class="login-page__grid" />

    <view class="login-page__hero">
      <view class="login-page__brand">
        <slot name="logo">
          <view class="login-page__mark" aria-hidden="true">
            <view class="login-page__mark-main" />
            <view class="login-page__mark-dots">
              <text class="login-page__mark-dot login-page__mark-dot--left" />
              <text class="login-page__mark-dot login-page__mark-dot--top" />
              <text class="login-page__mark-dot login-page__mark-dot--bottom" />
            </view>
          </view>
        </slot>
        <text class="login-page__name">{{ brand.name }}</text>
        <text class="login-page__badge">{{ brand.badge }}</text>
      </view>
      <text class="login-page__eyebrow">{{ brand.eyebrow }}</text>
      <text class="login-page__title" role="heading" aria-level="1">{{ brand.title }}</text>
      <text class="login-page__description">{{ brand.description }}</text>
      <view v-if="brand.benefits.length" class="login-page__trust">
        <view v-for="benefit in brand.benefits" :key="benefit" class="login-page__trust-item"><text class="login-page__trust-dot" />{{ benefit }}</view>
      </view>
    </view>

    <view id="mobile-login-form" class="login-form" role="form" :aria-label="brand.badge + '账号登录'">
      <view class="login-form__head">
        <view>
          <text class="login-form__title" role="heading" aria-level="2">账号登录</text>
          <text id="mobile-login-hint" class="login-form__hint">{{ accountHint }}</text>
        </view>
        <text class="login-form__secure">安全登录</text>
      </view>
      <view class="login-form__control" :class="{ 'login-form__control--error': accountError }">
        <label class="login-form__label" :for="labelTarget('account')" @click="focusInput('account')">{{ accountLabel }}</label>
        <view class="login-form__field" :class="{ 'login-form__field--focused': focusField === 'account' }">
          <MobileIcon name="user" size="34rpx" />
          <input
            :id="fieldIds.account"
            ref="accountControl"
            class="login-form__input"
            v-model="account"
            name="username"
            :aria-label="accountLabel"
            :aria-invalid="accountError ? true : undefined"
            aria-required="true"
            :aria-describedby="accountDescription"
            :focus="focusField === 'account'"
            :placeholder="accountPlaceholder"
            placeholder-style="color: var(--login-muted)"
            autocomplete="username"
            type="text"
            confirm-type="next"
            :maxlength="-1"
            :disabled="loading"
            @focus="focusField = 'account'"
            @blur="blurInput('account')"
            @confirm="focusInput('password')"
          />
          <button
            v-if="account"
            class="mobile-action mobile-action--icon login-form__affordance"
            role="button"
            :tabindex="loading ? -1 : 0"
            :disabled="loading"
            :aria-disabled="loading || undefined"
            aria-label="清除账号"
            hover-class="mobile-action--pressed"
            @click="clearAccount"
            @keydown="preventActionKey"
            @keyup="activateActionKey($event, clearAccount)"
          >
            <wd-icon name="close-circle" size="34rpx" aria-hidden="true" />
          </button>
        </view>
        <text v-if="accountError" id="mobile-login-account-error" class="login-form__error" role="alert">{{ accountError }}</text>
      </view>
      <view class="login-form__control" :class="{ 'login-form__control--error': passwordError }">
        <label class="login-form__label" :for="labelTarget('password')" @click="focusInput('password')">登录密码</label>
        <view class="login-form__field" :class="{ 'login-form__field--focused': focusField === 'password' }">
          <MobileIcon name="lock" size="34rpx" />
          <input
            :id="fieldIds.password"
            ref="passwordControl"
            class="login-form__input"
            v-model="password"
            name="password"
            aria-label="登录密码"
            :aria-invalid="passwordError ? true : undefined"
            aria-required="true"
            :aria-describedby="passwordDescription"
            :focus="focusField === 'password'"
            placeholder="请输入登录密码"
            placeholder-style="color: var(--login-muted)"
            autocomplete="current-password"
            type="text"
            :password="!passwordVisible"
            confirm-type="done"
            :maxlength="-1"
            :disabled="loading"
            @focus="focusField = 'password'"
            @blur="blurInput('password')"
            @confirm="submit"
          />
          <button
            class="mobile-action mobile-action--icon login-form__affordance"
            role="button"
            :tabindex="loading ? -1 : 0"
            :disabled="loading"
            :aria-disabled="loading || undefined"
            :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
            hover-class="mobile-action--pressed"
            @click="togglePassword"
            @keydown="preventActionKey"
            @keyup="activateActionKey($event, togglePassword)"
          >
            <wd-icon :name="passwordVisible ? 'eye' : 'eye-invisible'" size="34rpx" aria-hidden="true" />
          </button>
        </view>
        <text v-if="passwordError" id="mobile-login-password-error" class="login-form__error" role="alert">{{ passwordError }}</text>
      </view>
      <text v-if="loginError" class="login-form__error login-form__error--server" role="alert" aria-live="polite">{{ loginError }}</text>

      <view class="login-form__options">
        <view class="login-form__remember">
          <wd-checkbox
            v-model="remember"
            type="square"
            checked-color="var(--login-primary)"
            :disabled="loading"
          >
            记住我
          </wd-checkbox>
        </view>
        <MobileAction variant="link" @click="forgotPassword">
          忘记密码？
        </MobileAction>
      </view>

      <text v-if="notice && !loginError" class="login-form__notice">{{ notice }}</text>
      <view class="login-form__button">
        <wd-button
          :custom-class="themeScope + '-primary-action'"
          type="primary"
          size="large"
          block
          :round="false"
          :loading="loading"
          :disabled="loading"
          :aria-busy="loading"
          :aria-disabled="loading || phoneLoading"
          role="button"
          :tabindex="loading || phoneLoading ? -1 : 0"
          @click="submit"
          @keydown.enter.prevent="submit"
          @keydown.space.prevent="submit"
        >
          登录
        </wd-button>
      </view>
      <view v-if="!!demo" class="login-form__demo">
        <MobileAction variant="link" :disabled="loading || phoneLoading" @click="demo">进入演示</MobileAction>
      </view>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <view v-if="!!authenticatePhone" class="login-page__phone-wrap">
      <button
        class="mobile-action login-page__phone-button"
        open-type="getPhoneNumber"
        :disabled="loading || phoneLoading"
        :aria-busy="phoneLoading || undefined"
        hover-class="mobile-action--pressed"
        @getphonenumber="phoneLogin"
      >
        <view class="mobile-icon-box login-page__phone-icon" aria-hidden="true">
          <wd-loading v-if="phoneLoading" type="circular" color="#ffffff" size="34rpx" />
          <MobileIcon v-else name="mobile" size="44rpx" />
        </view>
        <text>{{ phoneLoading ? '正在登录…' : '手机一键登录' }}</text>
      </button>
      <text v-if="phoneError" class="login-page__phone-error" role="alert">{{ phoneError }}</text>
    </view>
    <!-- #endif -->
    <view class="login-page__agreement">
      {{ helpText }}
    </view>
  </view>
</wd-config-provider>
</template>

<style scoped lang="scss">
.login-page {
  --mobile-action-link-padding: 0 4rpx 0 18rpx;
  --mobile-action-link-active-color: var(--login-primary-deep);
  --mobile-action-link-active-background: rgba(var(--login-primary-rgb), 0.06);

  position: relative;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  padding: calc(70rpx + var(--mobile-safe-top, 0px))
    max(34rpx, var(--mobile-safe-right, 0px))
    calc(32rpx + var(--mobile-safe-bottom, 0px))
    max(34rpx, var(--mobile-safe-left, 0px));
  overflow-x: hidden;
  background:
    radial-gradient(circle at 92% 2%, rgba(var(--login-primary-rgb), 0.12), transparent 360rpx),
    linear-gradient(180deg, var(--login-primary-soft) 0%, var(--login-bg) 52%, var(--login-bg) 100%);
  display: flex;
  flex-direction: column;
}

.login-page__orb {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  pointer-events: none;
}

.login-page__orb--one {
  top: -220rpx;
  right: -220rpx;
  width: 540rpx;
  height: 540rpx;
  border: 1rpx solid rgba(var(--login-primary-rgb), 0.12);
  box-shadow:
    0 0 0 74rpx rgba(var(--login-primary-rgb), 0.025),
    0 0 0 148rpx rgba(var(--login-primary-rgb), 0.018);
}

.login-page__orb--two {
  left: -120rpx;
  bottom: 120rpx;
  width: 260rpx;
  height: 260rpx;
  background: rgba(56, 189, 248, 0.05);
  filter: blur(8rpx);
}

.login-page__grid {
  position: absolute;
  inset: 0 0 auto;
  height: 620rpx;
  opacity: 0.08;
  background-image:
    linear-gradient(rgba(var(--login-primary-rgb), 0.08) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(var(--login-primary-rgb), 0.08) 1rpx, transparent 1rpx);
  background-size: 82rpx 82rpx;
  mask-image: linear-gradient(to bottom, #000, transparent);
  pointer-events: none;
}

.login-page__hero,
.login-form,
.login-page__phone-wrap,
.login-page__agreement {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.login-page__hero {
  padding: 0 14rpx;
}

.login-page__hero,
.login-form {
  flex-shrink: 0;
}

.login-page__brand {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.login-page__mark {
  position: relative;
  width: 72rpx;
  height: 72rpx;
}

.login-page__mark-main {
  position: absolute;
  left: 5rpx;
  top: 14rpx;
  width: 48rpx;
  height: 48rpx;
  background: linear-gradient(135deg, var(--login-primary), var(--login-primary-bright));
  border-radius: 14rpx;
  box-shadow: 0 12rpx 22rpx rgba(var(--login-primary-rgb), 0.22);
  transform: rotate(45deg);
}

.login-page__mark-dots {
  position: absolute;
  right: 0;
  top: 20rpx;
  width: 38rpx;
  height: 42rpx;
}

.login-page__mark-dot {
  position: absolute;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #f59e0b;
}

.login-page__mark-dot--left {
  left: 0;
  top: 14rpx;
}

.login-page__mark-dot--top {
  left: 16rpx;
  top: 0;
}

.login-page__mark-dot--bottom {
  right: 0;
  bottom: 0;
}

.login-page__name {
  color: #172033;
  font-size: 50rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.login-page__badge {
  height: 42rpx;
  padding: 0 14rpx;
  border-radius: 10rpx;
  background: var(--login-primary);
  color: #fff;
  font-size: max(23rpx, 12px);
  font-weight: 700;
  display: flex;
  align-items: center;
}

.login-page__eyebrow {
  display: block;
  margin-top: 64rpx;
  color: var(--login-primary);
  font-size: max(19rpx, 12px);
  font-weight: 700;
}

.login-page__title {
  display: block;
  margin-top: 18rpx;
  color: var(--login-text-strong);
  font-size: 46rpx;
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -1.2rpx;
  font-optical-sizing: auto;
}

.login-page__description {
  display: block;
  max-width: 590rpx;
  margin-top: 18rpx;
  color: var(--login-text-secondary);
  font-size: max(25rpx, 12px);
  font-weight: 500;
  line-height: 1.65;
}

.login-page__trust {
  margin-top: 28rpx;
  display: flex;
  align-items: center;
  gap: 12rpx 28rpx;
  flex-wrap: wrap;
  color: var(--login-muted);
  font-size: max(21rpx, 12px);
  font-weight: 600;
}

.login-page__trust-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.login-page__trust-dot {
  width: 9rpx;
  height: 9rpx;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 5rpx rgba(16, 185, 129, 0.1);
}

.login-form {
  margin-top: 54rpx;
  padding: 32rpx;
  background: var(--login-material-regular);
  border: 1rpx solid rgba(255, 255, 255, 0.76);
  border-radius: 30rpx;
  box-shadow: var(--login-shadow-floating);
  backdrop-filter: blur(26rpx) saturate(145%);
  -webkit-backdrop-filter: blur(26rpx) saturate(145%);
}

.login-form__head {
  margin-bottom: 28rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.login-form__title,
.login-form__hint {
  display: block;
}

.login-form__title {
  color: var(--login-text-strong);
  font-size: 30rpx;
  font-weight: 700;
}

.login-form__hint {
  margin-top: 8rpx;
  color: var(--login-text-secondary);
  font-size: max(21rpx, 12px);
}

.login-form__secure {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  color: var(--login-green-strong);
  background: var(--login-green-soft);
  font-size: max(20rpx, 12px);
  font-weight: 700;
}

.login-form__field {
  display: flex;
  align-items: center;
  gap: 14rpx;
  height: 98rpx;
  min-height: 44px;
  padding-left: 24rpx;
  border: 1rpx solid var(--login-line);
  border-radius: 18rpx;
  background: rgba(118, 118, 128, 0.08);
  transition:
    border-color var(--login-apple-duration-fast) var(--login-apple-ease),
    box-shadow var(--login-apple-duration-fast) var(--login-apple-ease),
    background-color var(--login-apple-duration-fast) var(--login-apple-ease);
}

.login-form__input {
  flex: 1;
  align-self: stretch;
  min-width: 0;
  height: auto;
  color: var(--login-text-strong);
  font-size: max(28rpx, 14px);
}

.mobile-action.login-form__affordance {
  border-radius: 8px;
  color: var(--login-muted);
}

.login-form__control + .login-form__control {
  margin-top: 18rpx;
}

.login-form__label {
  display: block;
  margin-bottom: 10rpx;
  color: var(--login-text-secondary);
  font-size: max(25rpx, 14px);
  font-weight: 600;
}

.login-form__control--error .login-form__field {
  border-color: #e5484d;
}

.login-form__field--focused,
.login-form__field:focus-within {
  border-color: var(--login-primary);
  background: rgba(var(--login-primary-rgb), 0.045);
  box-shadow: 0 0 0 4rpx rgba(var(--login-primary-rgb), 0.12);
}

.login-form__control--error .login-form__field--focused,
.login-form__control--error .login-form__field:focus-within {
  border-color: #e5484d;
  box-shadow: 0 0 0 3px rgba(229, 72, 77, 0.13);
}

.login-form__error {
  display: block;
  margin-top: 8rpx;
  color: var(--login-red-strong);
  font-size: max(22rpx, 12px);
  line-height: 1.4;
}

.login-form__error--server {
  margin-top: 18rpx;
}

.login-form__options {
  margin-top: 20rpx;
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--login-text-strong);
  font-size: max(26rpx, 12px);
}

.login-form__remember {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  font-size: max(24rpx, 12px);
}

.login-form__remember :deep(.wd-checkbox__shape) {
  width: 32rpx;
  height: 32rpx;
  border-width: 2rpx;
  border-radius: 10rpx;
}

.login-form__remember :deep(.wd-checkbox__label) {
  color: var(--login-text-strong);
  font-size: max(23rpx, 12px);
}

.login-form__button {
  margin-top: 24rpx;
}

@media screen and (max-height: 700px) {
  .login-page {
    padding-top: calc(38rpx + var(--mobile-safe-top, 0px));
  }

  .login-page__eyebrow {
    margin-top: 34rpx;
  }

  .login-form {
    margin-top: 38rpx;
  }
}

/* #ifdef MP-WEIXIN */
.login-page {
  padding-top: max(var(--mobile-capsule-top, 0px), calc(48px + var(--mobile-safe-top, 0px)));
}
/* #endif */

.login-page__phone-wrap {
  margin-top: 24rpx;
  flex-shrink: 0;
  display: grid;
  justify-items: center;
  gap: 4px;
}

.mobile-action.login-page__phone-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: max(220rpx, 110px);
  min-height: max(130rpx, 65px);
  padding: 6px 12px;
  gap: 10rpx;
  border-radius: 12px;
  color: var(--login-text-strong);
  font-size: max(24rpx, 12px);
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
}

.login-page__phone-icon {
  width: 74rpx;
  height: 74rpx;
  border-radius: 50%;
  color: #fff;
  background: var(--login-primary);
  box-shadow: var(--login-shadow-primary);
}

.login-page__phone-error {
  color: var(--login-red-strong);
  font-size: .8125rem;
  line-height: 1.45;
  text-align: center;
  overflow-wrap: anywhere;
}

.login-page__agreement {
  margin-top: auto;
  padding-top: 30rpx;
  color: var(--login-light);
  font-size: max(20rpx, 12px);
  line-height: 1.6;
  text-align: center;
}

@media (prefers-reduced-transparency: reduce) {
  .login-form {
    background: var(--login-surface);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

.login-form__notice {
  display: block;
  color: var(--login-text-secondary);
  font-size: max(22rpx, 12px);
}

.login-form__demo {
  margin-top: 20rpx;
  border-top: 1rpx solid var(--login-line);
  display: flex;
  justify-content: center;
}

</style>
