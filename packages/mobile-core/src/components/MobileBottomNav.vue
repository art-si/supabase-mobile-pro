<script setup lang="ts">
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { styleIsolation: 'apply-shared' } })

interface NavItem {
  key: string
  label: string
  icon: string
  url?: string
  action?: boolean
}

const props = defineProps<{ active: string; items: readonly NavItem[] }>()
const emit = defineEmits<{ action: [key: string] }>()

function go(value: string | number) {
  const item = props.items.find((entry) => entry.key === value)
  if (!item || item.key === props.active) return
  if (item.action) emit('action', item.key)
  else if (item.url) uni.reLaunch({ url: item.url })
}

function preventActivation(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return false
  event.preventDefault()
  event.stopPropagation()
  return true
}

function activateFromKeyboard(event: KeyboardEvent, key: string) {
  if (preventActivation(event)) go(key)
}
</script>

<template>
  <view class="bottom-nav">
    <wd-tabbar
      :model-value="props.active"
      custom-class="bottom-nav__bar"
      active-color="var(--tms-primary, var(--smis-primary))"
      inactive-color="var(--tms-disabled, var(--smis-disabled))"
      role="navigation"
      aria-label="主导航"
      @change="go($event.value)"
    >
      <wd-tabbar-item
        v-for="item in items"
        :key="item.key"
        :name="item.key"
        :custom-class="item.key === props.active ? 'bottom-nav__item bottom-nav__item--active' : 'bottom-nav__item'"
        :aria-label="item.label"
        :aria-current="item.key === props.active ? 'page' : undefined"
        :role="item.action ? 'button' : 'link'"
        tabindex="0"
        @keydown="preventActivation"
        @keyup="activateFromKeyboard($event, item.key)"
      >
        <view class="bottom-nav__content">
          <view v-if="item.key === props.active" class="bottom-nav__active-pill" />
          <view class="bottom-nav__icon-box" :class="{
            'bottom-nav__icon-box--active': item.key === props.active,
            'bottom-nav__icon-box--action': item.action
          }">
            <MobileIcon :name="item.icon" size="44rpx" />
          </view>
          <text class="bottom-nav__label" :class="{ 'bottom-nav__label--active': item.key === props.active }">{{ item.label }}</text>
        </view>
      </wd-tabbar-item>
    </wd-tabbar>
  </view>
</template>

<style scoped lang="scss">
.bottom-nav {
  position: fixed;
  left: var(--mobile-nav-inset, 18rpx);
  right: var(--mobile-nav-inset, 18rpx);
  bottom: var(--mobile-nav-bottom, calc(var(--mobile-nav-inset, 14rpx) + var(--mobile-safe-bottom, 0px)));
  z-index: 20;
  height: var(--mobile-nav-height, var(--smis-nav-height, 132rpx));
  padding: var(--mobile-nav-padding, 12rpx 18rpx);
  box-sizing: var(--mobile-nav-box-sizing, content-box);
  overflow: hidden;
  background: var(--mobile-nav-background, var(--tms-material-thin, var(--smis-material-thin)));
  border: 1rpx solid var(--mobile-nav-border, rgba(255, 255, 255, 0.7));
  border-width: var(--mobile-nav-border-width, 1rpx);
  border-radius: var(--mobile-nav-radius, 32rpx);
  backdrop-filter: var(--mobile-nav-backdrop, blur(28rpx) saturate(150%));
  -webkit-backdrop-filter: var(--mobile-nav-backdrop, blur(28rpx) saturate(150%));
  display: block;
  box-shadow: var(--mobile-nav-shadow, var(--tms-shadow-floating, var(--smis-shadow-floating)), 0 2rpx 0 rgba(255, 255, 255, 0.9) inset);
}

:deep(.bottom-nav__bar) {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: transparent;
}

:deep(.bottom-nav__item) {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 22rpx;
  background: transparent;
  min-width: 0;
  min-height: 44px;
  color: var(--mobile-nav-inactive-color, var(--tms-disabled, var(--smis-disabled)));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  font-size: var(--mobile-nav-label-size, max(24rpx, 12px));
  font-weight: 600;
  line-height: 1.1;
  touch-action: manipulation;
  transition:
    color var(--tms-apple-duration-fast, var(--smis-apple-duration-fast)) var(--tms-apple-ease, var(--smis-apple-ease)),
    background-color var(--tms-apple-duration-fast, var(--smis-apple-duration-fast)) var(--tms-apple-ease, var(--smis-apple-ease));
}

:deep(.bottom-nav__item)::after {
  border: 0;
}

:deep(.bottom-nav__item--pressed),
:deep(.bottom-nav__item:active) {
  background: rgba(var(--tms-primary-rgb, var(--smis-primary-rgb)), 0.06);
}

:deep(.bottom-nav__item--active) {
  color: var(--tms-primary, var(--smis-primary));
  font-weight: 700;
}

.bottom-nav__active-pill {
  display: var(--mobile-nav-active-decoration, block);
  position: absolute;
  top: var(--mobile-nav-selected-top, 3rpx);
  width: var(--mobile-nav-selected-width, 74rpx);
  height: var(--mobile-nav-selected-height, 60rpx);
  border-radius: 20rpx;
  background: var(--mobile-nav-selected-fill, linear-gradient(180deg, var(--tms-primary-soft, var(--smis-primary-soft)), var(--tms-primary-soft-strong, var(--smis-primary-soft-strong))));
}

.bottom-nav__content {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
}

.bottom-nav__icon-box {
  position: relative;
  z-index: 1;
  width: var(--mobile-nav-icon-box, 62rpx);
  height: var(--mobile-nav-icon-box, 62rpx);
  border-radius: 18rpx;
  flex: none;
  color: var(--mobile-nav-inactive-color, var(--tms-disabled, var(--smis-disabled)));
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-nav__label {
  flex: none;
  color: var(--mobile-nav-label-color, var(--tms-muted, var(--smis-muted)));
  font-size: var(--mobile-nav-label-size, max(24rpx, 12px));
  font-weight: 600;
  line-height: 1.1;
  white-space: nowrap;
}

.bottom-nav__icon-box--active,
.bottom-nav__label--active {
  color: var(--tms-primary, var(--smis-primary));
}

.bottom-nav__icon-box--action {
  width: var(--mobile-nav-action-size, var(--mobile-nav-icon-box, 62rpx));
  height: var(--mobile-nav-action-size, var(--mobile-nav-icon-box, 62rpx));
  color: #fff;
  background: var(--tms-primary, var(--smis-primary));
  border-radius: var(--mobile-nav-action-radius, 20rpx);
}
.bottom-nav__label--active {
  font-weight: 700;
}

:deep(.bottom-nav__item--active) .bottom-nav__icon-box {
  background: transparent;
}


:deep(.bottom-nav__item) text {
  position: relative;
  z-index: 1;
}

:deep(.bottom-nav__item):focus-visible {
  outline: 4rpx solid rgba(var(--tms-primary-rgb, var(--smis-primary-rgb)), 0.36);
  outline-offset: -4rpx;
}

@media (hover: hover) {
  :deep(.bottom-nav__item:hover) {
    color: var(--tms-primary, var(--smis-primary));
    background: rgba(var(--tms-primary-rgb, var(--smis-primary-rgb)), 0.05);
  }
}

@media screen and (min-width: 520px) {
  .bottom-nav {
    left: 50%;
    right: auto;
    width: var(--mobile-nav-desktop-width, min(calc(100vw - 36rpx), 484px));
    transform: translateX(-50%);
  }
}
</style>
