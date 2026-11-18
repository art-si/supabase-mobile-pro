<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch, watchPostEffect } from 'vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import { formatConversationText } from '../conversation-format'
import { nativeFieldOf, revealControl, useNativeFieldAttributes } from '../form-focus'
import { useVisibleViewport } from '../visible-viewport'
import MobileIcon from './MobileIcon.vue'
import MobileInlineLabel from './MobileInlineLabel.vue'
import MobileTopBar from './MobileTopBar.vue'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const props = withDefaults(defineProps<{
  title: string
  intro: string
  scope: string
  assistance: string
  backFallback: string
  field: string
  placeholder?: string
  limit?: number
  ready: boolean
  sending: boolean
  canReset: boolean
  prompts: readonly { icon: string; label: string; question: string }[]
  messages: readonly {
    role: 'user' | 'assistant'
    content: string
    failure?: { message: string; action?: 'retry' | 'reset' }
  }[]
}>(), { limit: 2000, placeholder: '输入你的问题…' })

const draft = defineModel<string>({ default: '' })
const emit = defineEmits<{ send: []; retry: []; reset: []; recover: [] }>()
const instance = getCurrentInstance()
const nativeField = useNativeFieldAttributes(() => ({
  id: `${props.field}-input`,
  'aria-label': '你的问题',
  autocomplete: 'off'
}))
const target = ref('')
const following = ref(true)
const composerFocused = ref(false)
const visibleViewport = useVisibleViewport()
const viewportStyle = computed(() => {
  const bounds = visibleViewport.value
  return bounds ? { top: `${bounds.top}px`, '--conversation-visible-height': `${bounds.height}px` } : undefined
})
const latestFailure = computed(() => props.messages[props.messages.length - 1]?.failure)
const canSend = computed(() => props.ready && !props.sending && latestFailure.value?.action !== 'reset' && !!draft.value.trim())
const turns = computed(() => props.messages.map(message => ({
  ...message,
  lines: message.role === 'assistant' ? formatConversationText(message.content) : []
})))
let viewportHeight = 0
let lastTop = 0

function measureViewport() {
  const query = uni.createSelectorQuery()
  if (instance?.proxy) query.in(instance.proxy)
  query.select('.conversation__viewport').boundingClientRect(rect => {
    if (rect && !Array.isArray(rect) && typeof rect.height === 'number') viewportHeight = rect.height
  }).exec()
}

onMounted(measureViewport)
watch(visibleViewport, measureViewport, { flush: 'post' })

function trackScroll(event: { detail: { scrollTop: number; scrollHeight: number } }) {
  const { scrollTop, scrollHeight } = event.detail
  if (viewportHeight) following.value = scrollHeight - scrollTop - viewportHeight < 80
  else if (scrollTop < lastTop - 6) following.value = false
  lastTop = scrollTop
}

async function scrollTo(id: string) {
  target.value = ''
  await nextTick()
  target.value = id
  measureViewport()
}

function toLatest() {
  following.value = true
  void scrollTo('conversation-end')
}

function selectPrompt(question: string) {
  if (!props.ready) return
  draft.value = question
  // #ifdef H5
  void revealControl(`${props.field}-input`)
  // #endif
  // #ifndef H5
  composerFocused.value = true
  // #endif
}

function keepEditorInKeyboardPath() {
  // #ifdef H5
  nativeFieldOf(nativeField.value)?.focus({ preventScroll: true })
  // #endif
}

function submit(fromActionKey = false) {
  if (!canSend.value) return
  if (fromActionKey) keepEditorInKeyboardPath()
  following.value = true
  emit('send')
  // #ifdef H5
  void nextTick(() => {
    const field = nativeFieldOf(nativeField.value)
    // Uni debounces external textarea updates. Don't let the next keystroke append to a sent question.
    if (field && draft.value === '') field.value = ''
  })
  // #endif
}

function recover(fromActionKey = false) {
  if (!props.ready || props.sending || !latestFailure.value?.action) return
  if (latestFailure.value.action === 'reset') {
    emit('recover')
    return
  }
  if (fromActionKey) keepEditorInKeyboardPath()
  following.value = true
  emit('retry')
}

// #ifdef H5
function sendFromKeyboard(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    submit()
  }
}

watchPostEffect(onCleanup => {
  const field = nativeFieldOf(nativeField.value)
  if (!field || !(field instanceof HTMLTextAreaElement)) return
  field.addEventListener('keydown', sendFromKeyboard)
  onCleanup(() => field.removeEventListener('keydown', sendFromKeyboard))
})
// #endif

watch(
  () => [props.messages.length, props.sending, latestFailure.value] as const,
  ([length, sending, failure], [previousLength, wasSending]) => {
    if (!length) {
      following.value = true
      lastTop = 0
      target.value = ''
    } else if (following.value && length > previousLength && props.messages[length - 1]?.role === 'assistant') {
      // Start at the beginning of a new answer, so a long reply can be read in order.
      void scrollTo(`conversation-turn-${length - 1}`)
    } else if (following.value && (length > previousLength || (sending && !wasSending) || failure)) {
      void scrollTo('conversation-end')
    }
  },
  { flush: 'post' }
)

function copy(content: string) {
  uni.setClipboardData({ data: content, fail: () => uni.showToast({ title: '暂时无法复制', icon: 'none' }) })
}
</script>

<template>
  <view class="conversation" :class="{ 'conversation--fitted': viewportStyle }" :style="viewportStyle">
    <MobileTopBar
      class="conversation__header" :title="title" capsule="none" show-back :back-fallback="backFallback"
      :show-menu="canReset" menu-icon="add" menu-label="新对话" @menu="emit('reset')"
    />
    <scroll-view
      class="conversation__viewport" scroll-y :scroll-into-view="target" :lower-threshold="56"
      @scroll="trackScroll" @scrolltolower="following = true"
    >
      <view class="conversation__body" role="main">
        <view v-if="!turns.length" class="conversation__welcome">
          <view class="mobile-icon-box conversation__emblem"><MobileIcon name="message" :size="26" /></view>
          <text class="conversation__intro" role="heading" aria-level="2">{{ intro }}</text>
          <text class="conversation__scope">{{ scope }}</text>
          <view class="conversation__starters">
            <text class="conversation__section-label" role="heading" aria-level="3">常见问题</text>
            <view class="conversation__prompts">
              <button
                v-for="prompt in prompts" :key="prompt.label" class="mobile-action conversation__prompt"
                role="button" :tabindex="ready ? 0 : -1" :disabled="!ready" :aria-disabled="!ready || undefined"
                hover-class="mobile-action--pressed" @click="selectPrompt(prompt.question)"
                @keydown="preventActionKey" @keyup="activateActionKey($event, () => selectPrompt(prompt.question))"
              >
                <MobileInlineLabel :icon="prompt.icon" :label="prompt.label" :icon-size="19" icon-color="var(--conversation-accent)" />
              </button>
            </view>
          </view>
        </view>
        <view v-else role="log" aria-label="对话内容" aria-live="polite" aria-relevant="additions" class="conversation__thread">
          <view
            v-for="(turn, index) in turns" :id="`conversation-turn-${index}`" :key="index"
            class="conversation__turn" :class="`conversation__turn--${turn.role}`"
          >
            <template v-if="turn.role === 'user'">
              <text class="conversation__visually-hidden">我的问题</text>
              <text class="conversation__bubble" user-select>{{ turn.content }}</text>
              <view v-if="turn.failure" class="conversation__failure">
                <view class="mobile-inline-pair mobile-inline-pair--start conversation__failure-copy" :role="index === turns.length - 1 ? 'alert' : undefined">
                  <view class="mobile-inline-pair__icon"><MobileIcon name="info" :size="16" /></view>
                  <text class="mobile-inline-pair__label">{{ turn.failure.message }}</text>
                </view>
                <button
                  v-if="index === turns.length - 1 && turn.failure.action"
                  class="mobile-action mobile-action--link conversation__recover" role="button"
                  :tabindex="ready && !sending ? 0 : -1" :disabled="!ready || sending"
                  :aria-disabled="!ready || sending || undefined"
                  hover-class="mobile-action--pressed" @click="recover()" @keydown="preventActionKey"
                  @keyup="activateActionKey($event, () => recover(true))"
                >{{ turn.failure.action === 'retry' ? '重试' : '开始新对话' }}</button>
              </view>
            </template>
            <template v-else>
              <view class="conversation__byline">
                <view class="mobile-icon-box conversation__avatar"><MobileIcon name="message" :size="15" /></view>
                <text>{{ title }}</text>
              </view>
              <view class="conversation__answer">
                <view
                  v-for="(line, row) in turn.lines" :key="row" class="conversation__line"
                  :class="`conversation__line--${line.kind}`"
                  :role="line.kind === 'heading' ? 'heading' : undefined"
                  :aria-level="line.kind === 'heading' ? 3 : undefined"
                >
                  <text v-if="line.marker" class="conversation__marker">{{ line.marker }}</text>
                  <text class="conversation__line-copy" user-select><text v-for="(part, column) in line.parts" :key="column" :class="part.emphasis && `conversation__part--${part.emphasis}`">{{ part.text }}</text></text>
                </view>
              </view>
              <button class="mobile-action conversation__copy" role="button" tabindex="0"
                aria-label="复制这条回复" hover-class="mobile-action--pressed" @click="copy(turn.content)"
                @keydown="preventActionKey" @keyup="activateActionKey($event, () => copy(turn.content))"
              >复制</button>
            </template>
          </view>
        </view>
        <view v-if="sending" class="conversation__feedback" role="status">
          <wd-loading color="var(--mobile-workspace-accent)" size="16px" />
          <text>正在思考，请稍候…</text>
        </view>
        <view id="conversation-end" class="conversation__end" aria-hidden="true" />
      </view>
    </scroll-view>
    <view class="conversation__footer">
      <button v-if="!following && turns.length" class="mobile-action conversation__jump" role="button" tabindex="0"
        hover-class="mobile-action--pressed" @click="toLatest" @keydown="preventActionKey"
        @keyup="activateActionKey($event, toLatest)"
      >查看最新</button>
      <view class="conversation__composer">
        <textarea
          :id="field" ref="nativeField" v-model="draft" class="conversation__input"
          :class="{ 'conversation__input--empty': !draft }"
          aria-label="你的问题" :placeholder="placeholder" placeholder-class="conversation__placeholder"
          :maxlength="limit" auto-height :focus="composerFocused" :show-confirm-bar="false"
          @blur="composerFocused = false"
        />
        <button class="mobile-action mobile-action--icon conversation__send" :class="{ 'conversation__send--disabled': !canSend }"
          role="button" :tabindex="canSend ? 0 : -1" :aria-label="sending ? '等待回复…' : '发送'"
          :disabled="!canSend" :aria-disabled="!canSend || undefined" hover-class="mobile-action--pressed"
          @click="submit()" @keydown="preventActionKey" @keyup="activateActionKey($event, () => submit(true))"
        >
          <view class="conversation__send-icon"><MobileIcon name="arrow-right" :size="22" /></view>
        </button>
      </view>
      <text class="conversation__notice">{{ assistance }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.conversation {
  --conversation-inset-start: max(var(--mobile-workspace-inset, 16px), var(--mobile-safe-left, 0px));
  --conversation-inset-end: max(var(--mobile-workspace-inset, 16px), var(--mobile-safe-right, 0px));
  --conversation-wash: var(--tms-primary-soft, var(--smis-primary-soft, #e4f3f0));
  --conversation-muted: var(--mobile-workspace-muted, #566174);
  --conversation-line: var(--mobile-workspace-line, #e4e7eb);
  --conversation-accent: var(--mobile-workspace-accent, #126f64);
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  min-width: 0;
  color: var(--mobile-workspace-ink, #172033);
  background: var(--mobile-workspace-surface, #fff);
}

/* #ifdef H5 */
.conversation--fitted {
  position: fixed;
  inset-inline: 0;
  width: 100%;
  max-width: var(--mobile-workspace-max-width, 560px);
  height: var(--conversation-visible-height);
  margin-inline: auto;
}
.conversation--fitted .conversation__footer {
  --conversation-safe-bottom: 0px;
  display: flex;
  flex-wrap: wrap;
}
.conversation--fitted .conversation__jump { align-self: center; margin: 0 8px 0 0; }
.conversation--fitted .conversation__composer { flex: 1; min-width: 0; }
.conversation--fitted .conversation__notice { flex: 0 0 100%; }
.conversation--fitted .conversation__input {
  max-height: clamp(44px, calc(var(--conversation-visible-height) * 0.2), 136px);
}
.conversation--fitted .conversation__input :deep(.uni-textarea-wrapper) {
  max-height: clamp(44px, calc(var(--conversation-visible-height) * 0.16), 116px);
}
/* #endif */

.conversation__header {
  --conversation-top: calc(8px + var(--mobile-safe-top, 0px));
  /* #ifdef MP-WEIXIN */
  --conversation-top: var(--mobile-capsule-top, calc(48px + var(--mobile-safe-top, 0px)));
  /* #endif */
  --mobile-header-padding: var(--conversation-top) var(--conversation-inset-end) 8px var(--conversation-inset-start);
  --mobile-header-gap: 9px;
  --mobile-header-columns: 44px minmax(0, 1fr) 44px;
  --mobile-header-accessory-gap: 0px;
  --mobile-header-placeholder: 44px;
  --mobile-header-align: center;
  --mobile-header-title-size: max(18px, 1.125rem);
  --mobile-header-title-spacing: -0.01em;
  --mobile-header-accessory-background: transparent;
  --mobile-header-accessory-border: transparent;
  flex: none;
  border-bottom: 1px solid var(--conversation-line);
}

.conversation__viewport { flex: 1 1 auto; width: 100%; height: 0; min-height: 0; }
.conversation__body {
  min-width: 0;
  padding: 18px var(--conversation-inset-end) 12px var(--conversation-inset-start);
}

.conversation__welcome {
  max-width: 440px;
  padding: clamp(14px, 5vh, 50px) 0 18px;
  margin-inline: auto;
}
.conversation__emblem, .conversation__avatar {
  color: var(--conversation-accent);
  background: var(--conversation-wash);
}
.conversation__emblem { width: 54px; height: 54px; border-radius: 16px; margin-bottom: 16px; }
.conversation__intro {
  display: block;
  font-size: clamp(27px, 1.8rem + 1vw, 35px);
  line-height: 1.22;
  font-weight: 720;
  letter-spacing: -0.025em;
  text-wrap: balance;
}
.conversation__scope {
  display: block;
  max-width: 28em;
  margin-top: 8px;
  color: var(--conversation-muted);
  font-size: max(15px, .9375rem);
  line-height: 1.55;
}
.conversation__starters { margin-top: clamp(20px, 4vh, 36px); }
.conversation__section-label {
  display: block;
  margin-bottom: 9px;
  color: var(--conversation-muted);
  font-size: max(13px, .8125rem);
  font-weight: 650;
}
.conversation__prompts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, max(44%, 8.25rem)), 1fr)); gap: 8px; }
.conversation__prompt {
  --mobile-inline-pair-gap: 8px;
  --mobile-inline-pair-leading: 1.4;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  min-height: 48px;
  padding: 8px 10px;
  border: 1px solid var(--conversation-line);
  border-radius: 13px;
  color: inherit;
  background: transparent;
  text-align: start;
  font-size: max(14px, .875rem);
  line-height: 1.4;
  font-weight: 620;
  overflow-wrap: anywhere;
}

.conversation__thread { display: grid; gap: 24px; }
.conversation__turn { min-width: 0; }
.conversation__turn--user { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.conversation__bubble {
  max-width: 88%;
  padding: 11px 14px;
  border-radius: 16px 16px 5px 16px;
  background: var(--conversation-wash);
  font-size: max(16px, 1rem);
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.conversation__byline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 11px;
  font-size: max(13px, .8125rem);
  line-height: 1.3;
  font-weight: 680;
}
.conversation__avatar { width: 27px; height: 27px; border-radius: 9px; }
.conversation__answer {
  display: grid;
  min-width: 0;
  gap: 7px;
  font-size: max(16px, 1rem);
  line-height: 1.66;
  overflow-wrap: anywhere;
}
.conversation__line-copy { min-width: 0; }
.conversation__line--heading { margin-top: 5px; font-weight: 720; }
.conversation__line--item { display: grid; grid-template-columns: 1.625em minmax(0, 1fr); gap: 6px; }
.conversation__marker { color: var(--conversation-accent); font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; }
.conversation__line--quote { padding-inline-start: 10px; border-inline-start: 2px solid var(--conversation-line); color: var(--conversation-muted); }
.conversation__line--code { white-space: pre-wrap; }
.conversation__line--code, .conversation__part--code { border-radius: 6px; padding: 2px 5px; background: var(--mobile-workspace-canvas, #f2f3f6); }
.conversation__part--strong { font-weight: 720; }
.conversation__copy {
  display: inline-flex;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0 4px;
  color: var(--conversation-muted);
  background: transparent;
  font-size: max(13px, .8125rem);
}
.conversation__feedback { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 16px; color: var(--conversation-muted); font-size: max(14px, .875rem); }
.conversation__failure {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 2px 8px;
  max-width: 100%;
}
.conversation__failure-copy {
  flex: 0 1 auto;
  min-width: 0;
  color: var(--conversation-muted);
  font-size: max(13px, .8125rem);
}
.conversation__recover { min-width: 44px; min-height: 44px; text-align: center; }
.conversation__end { height: 1px; }

.conversation__footer {
  position: relative;
  flex: none;
  padding: 6px var(--conversation-inset-end) calc(9px + var(--conversation-safe-bottom, var(--mobile-safe-bottom, 0px))) var(--conversation-inset-start);
  border-top: 1px solid var(--conversation-line);
  background: var(--mobile-workspace-surface, #fff);
}
.conversation__composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 4px 4px 4px 12px;
  border: 1px solid var(--conversation-line);
  border-radius: 20px;
  background: var(--mobile-workspace-canvas, #f2f3f6);
}
.conversation__composer:focus-within { border-color: var(--conversation-accent); }
.conversation__input {
  --conversation-input-padding: max(0px, calc((44px - 1.5em) / 2));
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  width: 0;
  min-width: 0;
  min-height: 44px;
  max-height: min(136px, 20vh);
  max-height: min(136px, 20dvh);
  box-sizing: border-box;
  color: inherit;
  background: transparent;
  font-size: max(16px, 1rem);
  line-height: 1.5;
}
/* #ifdef MP-WEIXIN */
.conversation__input { display: block; padding-block: var(--conversation-input-padding); }
/* #endif */
.conversation__input :deep(.uni-textarea-wrapper) { width: 100%; max-height: min(116px, 16dvh); }
.conversation__input--empty :deep(.uni-textarea-wrapper) { height: max(44px, 1.5em) !important; }
.conversation__input :deep(.uni-textarea-textarea),
.conversation__input :deep(.uni-textarea-placeholder),
.conversation__input :deep(.uni-textarea-compute-auto-height) {
  padding-block: var(--conversation-input-padding);
  box-sizing: border-box;
}
// Uni sets an inline hidden overflow with auto-height; the capped input must remain scrollable.
.conversation__input :deep(.uni-textarea-textarea) { overflow-y: auto !important; }
.conversation__placeholder { color: var(--conversation-muted); }
.conversation__send {
  border-radius: 16px;
  color: #fff;
  background: var(--conversation-accent);
}
.conversation__send--disabled {
  opacity: 1;
  color: var(--conversation-muted);
  background: var(--conversation-line);
}
.conversation__send-icon { display: grid; place-items: center; transform: rotate(-90deg); }
.conversation__notice {
  display: block;
  margin-top: 6px;
  color: var(--conversation-muted);
  text-align: center;
  font-size: max(12px, .75rem);
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.conversation__jump {
  display: flex;
  align-items: center;
  width: max-content;
  min-height: 44px;
  margin: 0 0 6px auto;
  padding: 7px 12px;
  border: 1px solid var(--conversation-line);
  border-radius: 22px;
  color: var(--conversation-accent);
  background: var(--mobile-workspace-surface, #fff);
  font-size: max(13px, .8125rem);
  font-weight: 650;
}
.conversation__visually-hidden { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); overflow: hidden; }
</style>
