<script setup lang="ts">
import { inject } from 'vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import { systemInsetsKey, useSystemInsets } from '../system-insets'
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { styleIsolation: 'apply-shared' } })

const props = withDefaults(
  defineProps<{
    title: string
    eyebrow?: string
    subtitle?: string
    showBack?: boolean
    showMenu?: boolean
    menuIcon?: string
    menuLabel?: string
    backFallback?: string
    confirmBack?: () => Promise<boolean>
    capsule?: 'with-meta' | 'always' | 'none'
  }>(),
  {
    showBack: false,
    showMenu: false,
    menuIcon: 'menu',
    menuLabel: '打开更多操作',
    capsule: 'with-meta'
  }
)

const emit = defineEmits<{ menu: [] }>()
const systemInsets = inject(systemInsetsKey, useSystemInsets, true)

async function back() {
  if (props.confirmBack && !(await props.confirmBack())) return
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }
  uni.reLaunch({ url: props.backFallback || '/pages/home/index' })
}

function menu() {
  emit('menu')
}
</script>

<template>
  <view
    class="top-bar"
    :style="systemInsets"
    :class="{
      'top-bar--with-meta': capsule === 'with-meta' && (eyebrow || subtitle),
      'top-bar--reserve-capsule': capsule === 'always'
    }"
  >
    <view class="top-bar__glow" aria-hidden="true" />
    <button
      v-if="showBack"
      class="mobile-action mobile-action--icon top-bar__icon top-bar__icon--leading"
      aria-label="返回上一页"
      hover-class="top-bar__icon--pressed"
      role="button"
      tabindex="0"
      @click="back"
      @keydown="preventActionKey"
      @keyup="activateActionKey($event, back)"
    >
      <MobileIcon name="back" size="38rpx" />
    </button>
    <view v-else class="top-bar__spacer" />
    <view class="top-bar__copy">
      <text v-if="eyebrow" class="top-bar__eyebrow">{{ eyebrow }}</text>
      <text class="top-bar__title" role="heading" aria-level="1">{{ title }}</text>
      <text v-if="subtitle" class="top-bar__subtitle">{{ subtitle }}</text>
    </view>
    <button
      v-if="showMenu"
      class="mobile-action mobile-action--icon top-bar__icon top-bar__icon--trailing"
      :aria-label="menuLabel"
      hover-class="top-bar__icon--pressed"
      role="button"
      tabindex="0"
      @click="menu"
      @keydown="preventActionKey"
      @keyup="activateActionKey($event, menu)"
    >
      <MobileIcon :name="menuIcon" size="38rpx" />
    </button>
    <view v-else class="top-bar__spacer" />
  </view>
</template>

<style scoped lang="scss">
.top-bar {
  --top-bar-ease: var(--tms-apple-ease, var(--smis-apple-ease));
  --top-bar-fast-duration: var(--tms-apple-duration-fast, var(--smis-apple-duration-fast));
  --top-bar-standard-duration: var(--tms-apple-duration-standard, var(--smis-apple-duration-standard));
  position: relative;
  min-height: var(--mobile-header-min-height, 176rpx);
  padding: var(--mobile-header-padding, calc(34rpx + var(--mobile-safe-top, 0px)) 30rpx 28rpx);
  color: var(--mobile-header-foreground, #fff);
  overflow: hidden;
  background: var(--mobile-header-background, var(--tms-hero-gradient, var(--smis-hero-gradient)));
  display: grid;
  grid-template-columns: var(--mobile-header-columns, max(88rpx, 44px) minmax(0, 1fr) max(88rpx, 44px));
  align-items: center;
  gap: var(--mobile-header-gap, 18rpx);
}

/* #ifdef MP-WEIXIN */
.top-bar--with-meta,
.top-bar--reserve-capsule {
  min-height: var(--mobile-header-min-height, 250rpx);
}

// Page content scrolls beneath the native status bar and capsule.
.top-bar--with-meta::before,
.top-bar--reserve-capsule::before {
  position: fixed;
  z-index: 3;
  inset: 0 0 auto;
  width: 100%;
  max-width: var(--mobile-workspace-max-width, 560px);
  height: var(--mobile-capsule-top);
  margin-inline: auto;
  background: var(--mobile-workspace-canvas, #f2f3f6);
  content: '';
  pointer-events: none;
}

.top-bar--with-meta {
  padding-top: max(var(--mobile-capsule-top, 0px), var(--mobile-header-capsule-top, calc(110rpx + var(--mobile-safe-top, 0px))));
}

.top-bar--reserve-capsule {
  padding-top: max(var(--mobile-capsule-top, 0px), var(--mobile-header-capsule-top, max(124rpx, calc(68rpx + var(--mobile-safe-top, 0px)))));
}
/* #endif */

.top-bar::after {
  display: var(--mobile-header-decoration, block);
  position: absolute;
  right: -110rpx;
  top: -170rpx;
  width: 390rpx;
  height: 390rpx;
  content: '';
  border: 1rpx solid rgba(255, 255, 255, 0.11);
  border-radius: 50%;
  box-shadow: 0 0 0 58rpx rgba(255, 255, 255, 0.025);
  pointer-events: none;
}

.top-bar__glow {
  display: var(--mobile-header-decoration, block);
  position: absolute;
  left: 48%;
  bottom: -170rpx;
  width: 420rpx;
  height: 260rpx;
  border-radius: 50%;
  background: rgba(var(--tms-primary-rgb, var(--smis-primary-rgb)), 0.2);
  filter: blur(72rpx);
  pointer-events: none;
}

.top-bar__copy {
  position: relative;
  z-index: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: var(--mobile-header-align, center);
}

.top-bar__eyebrow {
  margin-bottom: 4rpx;
  font-size: max(22rpx, 12px);
  font-weight: 600;
  color: var(--mobile-header-meta-color, inherit);
  opacity: var(--mobile-header-meta-opacity, 0.76);
}

.top-bar__title {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: var(--mobile-header-title-wrap, nowrap);
  overflow-wrap: anywhere;
  font-size: var(--mobile-header-title-size, 34rpx);
  letter-spacing: var(--mobile-header-title-spacing, normal);
  font-weight: 700;
  line-height: 1.25;
}

.top-bar__subtitle {
  max-width: 100%;
  margin-top: 5rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: var(--mobile-header-subtitle-wrap, nowrap);
  overflow-wrap: anywhere;
  font-size: max(22rpx, 12px);
  font-weight: 600;
  color: var(--mobile-header-meta-color, inherit);
  opacity: var(--mobile-header-meta-opacity, 0.7);
}

.top-bar__icon,
.top-bar__spacer {
  position: relative;
  z-index: 1;
  width: var(--mobile-header-accessory-size, 88rpx);
  height: var(--mobile-header-accessory-size, 88rpx);
}

.top-bar__spacer {
  width: var(--mobile-header-placeholder, 88rpx);
  min-width: var(--mobile-header-placeholder, 44px);
  height: var(--mobile-header-placeholder, 88rpx);
  min-height: var(--mobile-header-placeholder, 44px);
}

.mobile-action.top-bar__icon {
  color: var(--mobile-header-accessory-color, #fff);
  background: var(--mobile-header-accessory-background, rgba(255, 255, 255, 0.13));
  backdrop-filter: blur(16rpx);
  -webkit-backdrop-filter: blur(16rpx);
  border: 1rpx solid var(--mobile-header-accessory-border, rgba(255, 255, 255, 0.18));
  border-radius: 50%;
  transition:
    transform var(--top-bar-fast-duration) var(--top-bar-ease),
    background-color var(--top-bar-standard-duration) var(--top-bar-ease),
    border-color var(--top-bar-standard-duration) var(--top-bar-ease);
}

.top-bar__icon--leading { margin-inline-end: var(--mobile-header-accessory-gap, 0px); }
.top-bar__icon--trailing { margin-inline-start: var(--mobile-header-accessory-gap, 0px); }

.top-bar__icon--pressed {
  background: var(--mobile-header-pressed-background, rgba(255, 255, 255, 0.22));
}

.top-bar__icon:active {
  transform: scale(0.95);
}

.top-bar__icon:focus-visible {
  outline: 4rpx solid var(--mobile-header-accessory-focus, rgba(255, 255, 255, 0.84));
  outline-offset: 3rpx;
}

@media (prefers-reduced-transparency: reduce) {
  .top-bar__icon {
    background: rgba(255, 255, 255, 0.28);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
