<script setup lang="ts">
import { preventActionKey, activateButtonKey } from '../action-keyboard'
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { styleIsolation: 'apply-shared' } })
withDefaults(defineProps<{
  disabled?: boolean
  mediaDisabled?: boolean
  sendDisabled?: boolean
  busy?: boolean
  emojiOpen?: boolean
  showCamera?: boolean
  showAttachments?: boolean
  /** Explicit state for conditional slots: WeChat retains their slot declarations. */
  showReply?: boolean
  showMeta?: boolean
  attachmentLabel?: string
  emojiTriggerId?: string
  sendLabel?: string
}>(), { sendLabel: '发表评论', showAttachments: true, showReply: undefined, showMeta: undefined, attachmentLabel: '添加图片 / 视频' })
const emit = defineEmits<{ emoji: []; camera: []; media: []; send: [] }>()
</script>

<template>
  <view class="mobile-comment-composer-shell">
  <view class="mobile-comment-composer" :aria-busy="busy || undefined">
    <view v-if="showReply ?? !!$slots.reply" class="mobile-comment-composer__reply"><slot name="reply" /></view>
    <view class="mobile-comment-composer__input"><slot /></view>
    <view v-if="$slots.attachments" class="mobile-comment-composer__attachments"><slot name="attachments" /></view>
    <view class="mobile-comment-composer__toolbar">
      <view class="mobile-comment-composer__tools">
        <button :id="emojiTriggerId" class="mobile-action mobile-action--icon mobile-comment-composer__tool" aria-label="表情" :aria-expanded="emojiOpen" :disabled="disabled" @click="emit('emoji')" role="button" :tabindex="(disabled) ? -1 : 0" :aria-disabled="(disabled) || undefined" hover-class="mobile-action--pressed" @keydown="preventActionKey" @keyup="activateButtonKey"><MobileIcon name="emoji" :size="24" /></button>
        <button v-if="showCamera" class="mobile-action mobile-action--icon mobile-comment-composer__tool" aria-label="拍照" :disabled="disabled || mediaDisabled" @click="emit('camera')" role="button" :tabindex="(disabled || mediaDisabled) ? -1 : 0" :aria-disabled="(disabled || mediaDisabled) || undefined" hover-class="mobile-action--pressed" @keydown="preventActionKey" @keyup="activateButtonKey"><MobileIcon name="camera" :size="24" /></button>
        <button v-if="showAttachments" class="mobile-action mobile-action--icon mobile-comment-composer__tool" :aria-label="attachmentLabel" :disabled="disabled || mediaDisabled" @click="emit('media')" role="button" :tabindex="(disabled || mediaDisabled) ? -1 : 0" :aria-disabled="(disabled || mediaDisabled) || undefined" hover-class="mobile-action--pressed" @keydown="preventActionKey" @keyup="activateButtonKey"><MobileIcon name="photo" :size="24" /></button>
      </view>
      <button class="mobile-action mobile-comment-composer__send" :aria-label="busy ? '正在发送' : sendLabel" :aria-busy="busy || undefined" :disabled="disabled || sendDisabled || busy" @click="!busy && emit('send')" role="button" :tabindex="(disabled || sendDisabled || busy) ? -1 : 0" :aria-disabled="(disabled || sendDisabled || busy) || undefined" hover-class="mobile-action--pressed" @keydown="preventActionKey" @keyup="activateButtonKey">
        <view v-if="busy" class="mobile-comment-composer__spinner" aria-hidden="true" />
        <template v-else><text class="mobile-comment-composer__send-text">发送</text><view class="mobile-comment-composer__send-icon"><MobileIcon name="send" :size="22" /></view></template>
      </button>
    </view>
  </view>
  <view v-if="(showMeta ?? !!$slots.meta) && !busy" class="mobile-comment-composer__meta">
    <slot name="meta" />
  </view>
  <text v-if="busy" class="mobile-comment-composer__announcement" role="status">正在发送</text>
  </view>
</template>

<style scoped lang="scss">
.mobile-comment-composer-shell { min-width: 0; }
.mobile-comment-composer {
  --mobile-field-textarea-height: var(--mobile-comment-input-height, 84px);
  min-width: 0;
  padding: 12px 8px 8px;
  border: 1px solid var(--mobile-workspace-line, var(--tms-line-subtle));
  border-radius: var(--tms-card-radius, 16px);
  background: var(--tms-surface-muted, var(--tms-bg));
  color: var(--mobile-workspace-ink, var(--tms-text-strong));
}
.mobile-comment-composer:focus-within {
  border-color: var(--mobile-workspace-focus, var(--tms-primary));
  box-shadow: 0 0 0 1px var(--mobile-workspace-focus, var(--tms-primary));
}
.mobile-comment-composer__input,
.mobile-comment-composer__attachments,
.mobile-comment-composer__reply { min-width: 0; padding-inline: 4px; }
.mobile-comment-composer__reply { margin-bottom: 10px; }
// The slotted field owns a different scope ID; target its interior only through
// this composer's input region, instead of requiring the composer's ID on it.
.mobile-comment-composer .mobile-comment-composer__input :deep(.mobile-field) { gap: 6px; }
.mobile-comment-composer .mobile-comment-composer__input :deep(.mobile-field__control) {
  border: 0;
  border-radius: 0;
  outline: none;
  box-shadow: none;
  background: transparent;
  padding: 4px 0;
}
.mobile-comment-composer .mobile-comment-composer__input :deep(.mobile-field__control:focus-within) { outline: none; box-shadow: none; }
/* #ifdef H5 */
// Uni's wrapper and the focused native textarea have separate browser focus rules.
.mobile-comment-composer .mobile-comment-composer__input :deep(.uni-textarea-textarea),
.mobile-comment-composer .mobile-comment-composer__input :deep(.uni-textarea-textarea:focus),
.mobile-comment-composer .mobile-comment-composer__input :deep(.uni-textarea-textarea:focus-visible) {
  border: 0;
  border-radius: 0;
  background: transparent;
  outline: none;
  box-shadow: none;
}
/* #endif */
.mobile-comment-composer .mobile-comment-composer__input :deep(.mobile-field__control--textarea) {
  min-height: var(--mobile-comment-input-height, 84px);
  height: var(--mobile-comment-input-height, 84px);
  // Uni's native textarea fills its wrapper. Block padding would extend the editing area over the toolbar.
  padding-block: 0;
}
.mobile-comment-composer__attachments:empty { display: none; }
.mobile-comment-composer__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px 12px;
  padding: 6px 4px 2px;
  color: var(--mobile-workspace-muted, var(--tms-muted));
  font-size: .75rem;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
.mobile-comment-composer__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
.mobile-comment-composer__tools { display: flex; flex: 0 0 auto; align-items: center; }
.mobile-comment-composer__tool.mobile-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  padding: 0;
  border: 0;
  border-radius: var(--tms-control-radius, 12px);
  color: var(--mobile-workspace-muted, var(--tms-muted));
  background: transparent;
}
.mobile-comment-composer__send.mobile-action {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  min-height: 48px;
  padding: 8px 12px;
  border: 0;
  border-radius: var(--tms-control-radius, 12px);
  color: var(--mobile-workspace-on-accent, #fff);
  background: var(--mobile-workspace-accent, var(--tms-primary));
  font-size: .875rem;
  font-weight: 650;
  line-height: 1.4;
  white-space: nowrap;
}
.mobile-comment-composer__send-icon { display: none !important; }
.mobile-comment-composer__spinner {
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: mobile-comment-send-spin .8s linear infinite;
}
.mobile-comment-composer__announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@keyframes mobile-comment-send-spin { to { transform: rotate(360deg); } }
/* #ifdef H5 */
@media (prefers-reduced-motion: reduce) {
  .mobile-comment-composer__spinner { animation: none !important; }
}
/* #endif */
@media (max-width: 22rem) {
  .mobile-comment-composer__send.mobile-action { min-width: 48px; width: 48px; padding: 0; }
  .mobile-comment-composer__send-text { display: none; }
  .mobile-comment-composer__send-icon { display: inline-flex !important; }
}
</style>
