<script setup lang="ts">
import MobileIcon from './MobileIcon.vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'

defineOptions({ options: { styleIsolation: 'apply-shared' } })

interface NavItem {
  key: string
  label: string
  icon: string
  url?: string
  action?: boolean
  prominent?: boolean
}

const props = defineProps<{ active: string; items: readonly NavItem[] }>()
const emit = defineEmits<{ action: [key: string] }>()

function go(item: NavItem) {
  if (item.key === props.active) return
  if (item.action) emit('action', item.key)
  else if (item.url) uni.reLaunch({ url: item.url })
}
</script>

<template>
  <view class="bottom-nav">
    <view class="bottom-nav__bar" role="navigation" aria-label="主导航">
      <button
        v-for="item in items"
        :key="item.key"
        class="mobile-action bottom-nav__item"
        :class="{
          'bottom-nav__item--active': item.key === props.active,
          'bottom-nav__item--action': item.action,
          'bottom-nav__item--prominent': item.prominent
        }"
        :aria-label="item.label"
        :aria-current="item.key === props.active ? 'page' : undefined"
        :role="item.action ? 'button' : 'link'"
        tabindex="0"
        hover-class="bottom-nav__item--pressed"
        @click="go(item)"
        @keydown="preventActionKey"
        @keyup="activateActionKey($event, () => go(item))"
      >
        <view class="bottom-nav__content">
          <view class="mobile-icon-box bottom-nav__icon-box" aria-hidden="true">
            <slot name="icon" :item="item" :active="item.key === props.active">
              <MobileIcon :name="item.icon" :size="20" />
            </slot>
          </view>
          <text class="bottom-nav__label">{{ item.label }}</text>
        </view>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.bottom-nav {
  --bottom-nav-accent: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  --bottom-nav-tint: var(--tms-primary-soft, var(--smis-primary-soft));
  --bottom-nav-line: var(--mobile-workspace-line, var(--tms-line-subtle, var(--smis-line-subtle)));

  position: fixed;
  inset: auto 0 0;
  z-index: 20;
  width: 100%;
  max-width: var(--mobile-workspace-max-width, 560px);
  height: var(--mobile-nav-height, calc(64px + var(--mobile-safe-bottom, 0px)));
  margin-inline: auto;
  padding: 4px max(8px, var(--mobile-safe-right, 0px)) calc(4px + var(--mobile-safe-bottom, 0px))
    max(8px, var(--mobile-safe-left, 0px));
  box-sizing: border-box;
  overflow: hidden;
  background: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface)));
  border-top: 1px solid var(--bottom-nav-line);
}

.bottom-nav__bar {
  display: flex;
  width: 100%;
  height: 100%;
  background: transparent;
}

.bottom-nav__item {
  flex: 1 1 0;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  min-width: 0;
  min-height: 44px;
  color: var(--mobile-workspace-muted, #566174);
  font-weight: 600;
  line-height: 1.12;
}

.bottom-nav__item--pressed,
.bottom-nav__item:active {
  background: var(--bottom-nav-tint);
  opacity: 1;
}

.bottom-nav__item--active {
  color: var(--bottom-nav-accent);
  font-weight: 700;
}

.bottom-nav__content {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding-top: 5px;
  display: grid;
  grid-template-rows: 28px auto;
  align-content: start;
  justify-items: center;
  gap: 3px;
}

.bottom-nav__icon-box {
  width: 40px;
  height: 28px;
  border-radius: 14px;
}

.bottom-nav__label {
  max-width: 100%;
  font-size: max(11px, .75rem);
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
}

.bottom-nav__item--prominent:not(.bottom-nav__item--active) .bottom-nav__icon-box {
  box-shadow: inset 0 0 0 1px var(--bottom-nav-line);
}

.bottom-nav__item--action .bottom-nav__icon-box {
  color: #fff;
  background: var(--bottom-nav-accent);
}

.bottom-nav__item:focus-visible {
  outline: 2px solid var(--bottom-nav-accent);
  outline-offset: -2px;
}

@media (hover: hover) {
  .bottom-nav__item:not(:active):hover {
    background: rgba(var(--tms-primary-rgb, var(--smis-primary-rgb)), 0.05);
  }
}

</style>
