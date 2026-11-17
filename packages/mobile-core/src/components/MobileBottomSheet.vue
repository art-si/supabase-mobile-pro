<script setup lang="ts">
import { ref } from 'vue'
import MobileIcon from './MobileIcon.vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import { useOverlayFocus } from '../overlay-focus'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const visible = defineModel<boolean>({ required: true })
const props = defineProps<{ title: string; closeLabel: string; busy?: boolean; tall?: boolean; initialFocus?: string }>()
const panel = ref<HTMLElement | { $el?: unknown }>()
useOverlayFocus(visible, { panel: () => panel.value, initial: props.initialFocus, cancel: close })

function close() {
  if (!props.busy) visible.value = false
}
</script>

<template>
  <wd-popup
    :model-value="visible"
    position="bottom"
    :close-on-click-modal="!busy"
    custom-style="width:100%;max-width:var(--mobile-workspace-max-width,560px);margin-inline:auto;border-radius:24px 24px 0 0;overflow:hidden;padding-bottom:var(--mobile-safe-bottom,0px);background:var(--mobile-workspace-surface,var(--tms-surface,var(--smis-surface,#fff)));"
    @update:model-value="close"
  >
    <view ref="panel" class="mobile-sheet" :class="{ 'mobile-sheet--tall': tall }"
      role="dialog" aria-modal="true" :aria-label="title" :aria-busy="busy || undefined" tabindex="-1"
    >
      <view class="mobile-sheet__header">
        <text class="mobile-sheet__title" role="heading" aria-level="2">{{ title }}</text>
        <button
          class="mobile-action mobile-action--icon mobile-sheet__close"
          role="button" :tabindex="busy ? -1 : 0" :disabled="busy" :aria-label="closeLabel"
          hover-class="mobile-action--pressed"
          @click="close" @keydown="preventActionKey" @keyup="activateActionKey($event, close)"
        ><MobileIcon name="close" size="20px" aria-hidden="true" /></button>
      </view>
      <scroll-view class="mobile-sheet__body" scroll-y><slot /></scroll-view>
      <view v-if="$slots.footer" class="mobile-sheet__footer"><slot name="footer" /></view>
      <slot name="overlay" />
    </view>
  </wd-popup>
</template>

<style scoped lang="scss">
@use '../styles/workspace';

.mobile-sheet {
  --mobile-sheet-surface: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface, #fff)));
  --mobile-sheet-line: var(--mobile-workspace-line, var(--tms-line-subtle, var(--smis-line-subtle)));
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-height: calc(100vh - var(--mobile-safe-bottom, 0px));
  max-height: calc(100dvh - var(--mobile-safe-bottom, 0px));
  @include workspace.limit-bottom-sheet();
  background: var(--mobile-sheet-surface);
}

.mobile-sheet--tall {
  height: min(90vh, 800px);
  height: min(90dvh, 800px);
  background: var(--mobile-workspace-canvas, var(--tms-surface-soft, var(--smis-surface-soft, #f2f3f6)));
}

.mobile-sheet__header, .mobile-sheet__footer {
  flex: none;
  padding-left: max(16px, var(--mobile-safe-left, 0px));
  padding-right: max(16px, var(--mobile-safe-right, 0px));
  background: var(--mobile-sheet-surface);
}

.mobile-sheet__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding-block: 8px;
  border-bottom: 1px solid var(--mobile-sheet-line);
}

.mobile-sheet__title {
  color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong)));
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.mobile-sheet__close.mobile-action {
  border-radius: 14px;
  color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted)));
  background: var(--tms-surface-soft, var(--smis-surface-soft, #f2f3f6));
}

.mobile-sheet__body { flex: 0 1 auto; min-height: 0; overscroll-behavior: contain; }
.mobile-sheet--tall .mobile-sheet__body { flex: 1; height: 0; }

.mobile-sheet__footer {
  padding-block: 8px 10px;
  border-top: 1px solid var(--mobile-sheet-line);
}
</style>
