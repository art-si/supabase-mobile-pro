<script lang="ts">
let dialogSequence = 0
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useOverlayFocus } from '../overlay-focus'
import { activateActionKey, preventActionKey } from '../action-keyboard'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const visible = defineModel<boolean>({ required: true })
const props = withDefaults(defineProps<{
  title: string
  message?: string
  cancelText?: string
  confirmText?: string
  destructive?: boolean
  keepOpenOnConfirm?: boolean
  busy?: boolean
}>(), { cancelText: '取消', confirmText: '确认', destructive: true })
const emit = defineEmits<{ cancel: []; confirm: []; 'after-close': [] }>()

const messageId = `mobile-confirm-message-${++dialogSequence}`
const panel = ref<HTMLElement | { $el: HTMLElement }>()
useOverlayFocus(visible, {
  panel: () => panel.value,
  initial: '.mobile-confirm__cancel',
  cancel: () => close('cancel')
})

function close(outcome: 'cancel' | 'confirm') {
  if (!visible.value || props.busy) return
  if (outcome === 'cancel' || !props.keepOpenOnConfirm) visible.value = false
  if (outcome === 'confirm') emit('confirm')
  else emit('cancel')
}

</script>

<template>
  <wd-popup
    :model-value="visible"
    position="center"
    :z-index="70"
    :duration="220"
    transition="fade"
    :close-on-click-modal="!busy"
    custom-style="background:transparent;overflow:visible;"
    @update:model-value="close('cancel')"
    @after-leave="emit('after-close')"
  >
    <view
      ref="panel"
      class="mobile-confirm"
      tabindex="-1"
      :role="destructive ? 'alertdialog' : 'dialog'"
      aria-modal="true"
      :aria-label="title"
      :aria-describedby="message ? messageId : undefined"
      :aria-busy="busy || undefined"
    >
      <text class="mobile-confirm__title" role="heading" aria-level="2">{{ title }}</text>
      <text v-if="message" :id="messageId" class="mobile-confirm__message">{{ message }}</text>
      <slot />
      <view class="mobile-confirm__actions">
        <button
          class="mobile-action mobile-confirm__button mobile-confirm__cancel"
          role="button"
          :tabindex="busy ? -1 : 0"
          :disabled="busy"
          :aria-disabled="busy || undefined"
          hover-class="mobile-action--pressed"
          @click="close('cancel')"
          @keydown="preventActionKey"
          @keyup="activateActionKey($event, () => close('cancel'))"
        >
          {{ cancelText }}
        </button>
        <button
          class="mobile-action mobile-confirm__button mobile-confirm__submit"
          :class="{ 'mobile-confirm__submit--danger': destructive }"
          role="button"
          :tabindex="busy ? -1 : 0"
          :disabled="busy"
          :aria-disabled="busy || undefined"
          hover-class="mobile-action--pressed"
          @click="close('confirm')"
          @keydown="preventActionKey"
          @keyup="activateActionKey($event, () => close('confirm'))"
        >
          {{ confirmText }}
        </button>
      </view>
    </view>
  </wd-popup>
</template>

<style scoped lang="scss">
.mobile-confirm {
  --mobile-confirm-accent: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  --mobile-confirm-accent-rgb: var(--tms-primary-rgb, var(--smis-primary-rgb));
  display: grid;
  box-sizing: border-box;
  width: min(84vw, 360px, calc(100vw - 2 * max(16px, var(--mobile-safe-left, 0px), var(--mobile-safe-right, 0px))));
  max-height: 80vh;
  max-height: calc(100dvh - 2 * max(16px, var(--mobile-safe-top, 0px), var(--mobile-safe-bottom, 0px)));
  gap: 12px;
  padding: 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: 12px;
  background: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface)));
  box-shadow: var(--tms-shadow-floating, var(--smis-shadow-floating));
  overflow-wrap: anywhere;
  text-align: start;
}

.mobile-confirm__title {
  color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong)));
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.35;
  text-wrap: balance;
}

.mobile-confirm__message {
  color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted)));
  font-size: .875rem;
  line-height: 1.5;
}

.mobile-confirm__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 2px;
}

.mobile-confirm__button.mobile-action {
  display: grid;
  min-width: 0;
  min-height: max(44px, var(--tms-control-height, var(--smis-control-height)));
  width: 100%;
  padding: 8px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--tms-control-radius, var(--smis-control-radius));
  font-size: .875rem;
  font-weight: 700;
  line-height: 1.4;
  white-space: normal;
}

.mobile-confirm__button.mobile-action:active {
  opacity: .76;
}

.mobile-confirm__button.mobile-action[disabled] {
  opacity: .6;
}

.mobile-confirm__cancel.mobile-action {
  color: var(--mobile-confirm-accent);
  background: var(--tms-primary-soft, var(--smis-primary-soft));
  border-color: rgba(var(--mobile-confirm-accent-rgb), .22);
}

.mobile-confirm__submit.mobile-action {
  color: #fff;
  background: var(--mobile-confirm-accent);
}

.mobile-confirm__submit--danger.mobile-action {
  color: var(--tms-red-strong, var(--smis-red-strong));
  background: var(--tms-red-soft, var(--smis-red-soft));
  border-color: rgba(220, 38, 38, .18);
}
</style>
