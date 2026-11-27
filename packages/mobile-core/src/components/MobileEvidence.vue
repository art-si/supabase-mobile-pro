<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { activateActionKey, preventActionKey } from "../action-keyboard";
import { elementOf, type ElementTarget } from "../form-focus";
import MobileIcon from "./MobileIcon.vue";
import MobileInlineLabel from "./MobileInlineLabel.vue";
import MobileMediaTray from "./MobileMediaTray.vue";
import MobileImagePreview from "./MobileImagePreview.vue";
import { useMediaReorder } from "../media-reorder";

defineOptions({ options: { styleIsolation: "shared" } });

const props = withDefaults(
  defineProps<{
    images: readonly string[];
    label: string;
    uploadLabel?: string;
    hideAddButton?: boolean;
    compact?: boolean;
    limit?: number;
    uploading?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    customPreview?: boolean;
    mediaKinds?: readonly ("image" | "video")[];
    removeLabel?: string;
    allowUploadWhileBusy?: boolean;
    allowRemoveWhileBusy?: boolean;
    overlayRemove?: boolean;
    statusOverlay?: boolean;
    reorderable?: boolean;
  }>(),
  { uploadLabel: "拍照上传", limit: 5, removeLabel: "删除" },
);

const emit = defineEmits<{
  remove: [index: number];
  upload: [];
  "image-error": [index: number];
  swap: [from: number, to: number];
  preview: [index: number, event?: Event];
}>();
const unavailable = computed(() => props.disabled || props.uploading);
const uploadUnavailable = computed(
  () => props.disabled || (props.uploading && !props.allowUploadWhileBusy),
);
const removeUnavailable = computed(
  () => props.disabled || (props.uploading && !props.allowRemoveWhileBusy),
);
const root = ref<ElementTarget>();
const viewer = ref<InstanceType<typeof MobileImagePreview>>();

const reorder = useMediaReorder({ root: () => root.value, enabled: () => Boolean(props.reorderable && !props.disabled), count: () => props.images.length, swap: (from,to) => emit('swap',from,to) });
interface Thumbnail {
  url: string;
  key: string;
  failed: boolean;
  onError: () => void;
}

const thumbnails = ref<Thumbnail[]>([]);
// An original-image action needs its own row instead of being clipped by the compact tray.
const horizontalTray = computed(() => props.compact && props.overlayRemove &&
  (props.customPreview || !thumbnails.value.some((item) => item.failed)));
const trayStyle = computed(() => horizontalTray.value
  ? { width: `${thumbnails.value.length * 112 + Math.max(0, thumbnails.value.length - 1) * 12}px` }
  : undefined);

function createThumbnail(url: string, index: number): Thumbnail {
  const item = reactive<Thumbnail>({
    url,
    key: `${url}-${index}`,
    failed: false,
    onError() {
      if (thumbnails.value[index] !== item || item.failed) return;
      item.failed = true;
      emit("image-error", index);
    },
  });
  return item;
}

watch(
  () => [...props.images],
  (images) => {
    thumbnails.value = images.map((url, index) => {
      const existing = thumbnails.value[index];
      return existing?.url === url ? existing : createThumbnail(url, index);
    });
  },
  { immediate: true },
);

function openThumbnail(index: number, event: Event) {
  if (!reorder.allowClick()) return;
  if (props.customPreview) {
    emit("preview", index, event);
    return;
  }
  const thumbnail = thumbnails.value[index];
  if (!thumbnail) return;
  if (thumbnail.failed)
    thumbnails.value[index] = createThumbnail(thumbnail.url, index);
  else preview(index, event);
}

function preview(index = 0, event?: Event) {
  viewer.value?.open(props.images, props.label, index, event);
}

function remove(index: number, fromKeyboard = false) {
  if (removeUnavailable.value) return;
  // #ifdef H5
  const active = fromKeyboard ? document.activeElement : null;
  const oldLength = props.images.length;
  // #endif
  emit("remove", index);
  // #ifdef H5
  if (active?.matches(".mobile-evidence__remove"))
    void nextTick(() => {
      const container = elementOf(root.value);
      if (
        !container ||
        props.images.length >= oldLength ||
        (document.activeElement !== document.body &&
          document.activeElement !== active)
      )
        return;
      const controls = container.querySelectorAll<HTMLElement>(
        '.mobile-evidence__remove:not([aria-disabled="true"])',
      );
      const next =
        controls[Math.min(index, controls.length - 1)] ??
        container.querySelector<HTMLElement>(
          '.mobile-evidence__add:not([aria-disabled="true"])',
        );
      next?.focus();
    });
  // #endif
}

function previewKey(index: number, event: KeyboardEvent) { reorder.key(index,event); preventActionKey(event) }
function upload() {
  if (!uploadUnavailable.value) emit("upload");
}
defineExpose({ preview });
</script>

<template>
  <view
    ref="root"
    class="mobile-evidence"
    :class="{ 'mobile-evidence--overlay-remove': overlayRemove, 'mobile-evidence--reorderable': reorderable && !disabled, 'mobile-evidence--compact': compact, 'mobile-evidence--horizontal': horizontalTray }"
  >
    <MobileMediaTray v-if="thumbnails.length" :horizontal="horizontalTray" :scrolling="!reorder.dragging.value">
    <view class="mobile-evidence__grid" :style="trayStyle">
      <view
        v-for="(thumbnail, index) in thumbnails"
        :key="thumbnail.key"
        class="mobile-evidence__item"
        :class="{ 'mobile-evidence__item--dragging': reorder.from.value === index, 'mobile-evidence__item--target': reorder.dragging.value && reorder.target.value === index && reorder.from.value !== index, 'mobile-evidence__item--original': thumbnail.failed && !customPreview }"
        :style="reorder.style(index)"
      >
        <button
          class="mobile-action mobile-evidence__preview tms-evidence-preview"
          :data-reorder-index="index" :aria-description="reorderable ? '长按或拖动可交换位置，键盘按 Alt 加方向键调整' : undefined"
          @touchstart="reorder.touchStart(index, $event)" @touchmove="reorder.touchMove" @touchend="reorder.end" @touchcancel="reorder.cancel"
          @contextmenu="reorder.context" @dragstart.prevent
          role="button"
          tabindex="0"
          :aria-label="
            props.mediaKinds?.[index] === 'video'
              ? `预览视频 ${index + 1}`
              : thumbnail.failed
                ? `缩略图加载失败，重新加载第 ${index + 1} 张${label}`
                : `预览第 ${index + 1} 张${label}`
          "
          hover-class="mobile-action--pressed"
          @click="openThumbnail(index, $event)"
          @keydown="previewKey(index, $event)"
          @keyup="activateActionKey($event, () => openThumbnail(index, $event))"
        >
          <slot
            name="preview"
            :index="index"
            :url="thumbnail.url"
            :on-error="thumbnail.onError"
          >
            <view
              v-if="thumbnail.failed"
              class="mobile-evidence__fallback"
              aria-hidden="true"
            >
              <MobileIcon name="photo" size="16px" />
              <text>加载失败</text>
              <text class="mobile-evidence__retry-copy">重试加载</text>
            </view>
            <image
              v-else
              class="mobile-evidence__image"
              :src="thumbnail.url"
              mode="aspectFill"
              lazy-load
              aria-hidden="true"
              @error="thumbnail.onError"
            />
          </slot>
        </button>
        <button
          v-if="thumbnail.failed && !customPreview"
          class="mobile-action mobile-evidence__original"
          role="button"
          tabindex="0"
          :aria-label="`预览第 ${index + 1} 张${label}原图`"
          hover-class="mobile-action--pressed"
          @click="preview(index, $event)"
          @keydown="preventActionKey"
          @keyup="activateActionKey($event, () => preview(index, $event))"
        >
          预览原图
        </button>
        <view
          v-if="$slots.status"
          class="mobile-evidence__status"
          :class="{ 'mobile-evidence__status--overlay': statusOverlay }"
          ><slot name="status" :index="index"
        /></view>
        <button
          v-if="!readonly"
          class="mobile-action mobile-action--icon mobile-evidence__remove tms-evidence-remove"
          :class="{ 'mobile-evidence__remove--overlay': overlayRemove }"
          role="button"
          :tabindex="removeUnavailable ? -1 : 0"
          :aria-label="
            props.mediaKinds?.[index] === 'video'
              ? `${removeLabel}视频 ${index + 1}`
              : `${removeLabel}第 ${index + 1} 张${label}`
          "
          :disabled="removeUnavailable"
          :aria-disabled="removeUnavailable || undefined"
          hover-class="mobile-action--pressed"
          @click.stop="remove(index)"
          @keydown="preventActionKey"
          @keyup="activateActionKey($event, () => remove(index, true))"
        >
          <view v-if="overlayRemove" class="mobile-evidence__remove-mark"
            ><MobileIcon name="close" size="16px" color="#fff"
          /></view>
          <MobileIcon v-else name="close" size="16px" />
        </button>
      </view>
    </view>
    </MobileMediaTray>
    <button
      v-if="!readonly && !hideAddButton && images.length < props.limit"
      class="mobile-action mobile-evidence__add evidence-grid__add"
      role="button"
      :tabindex="uploadUnavailable ? -1 : 0"
      :disabled="uploadUnavailable"
      :aria-disabled="uploadUnavailable || undefined"
      :aria-busy="uploading"
      hover-class="mobile-action--pressed"
      @click="upload"
      @keydown="preventActionKey"
      @keyup="activateActionKey($event, upload)"
    >
      <MobileInlineLabel
        icon="camera"
        icon-size="18px"
        :label="uploading && !allowUploadWhileBusy ? '正在处理…' : uploadLabel"
      />
    </button>
    <MobileImagePreview ref="viewer" />
    <text class="mobile-evidence__announcement" role="status" aria-live="polite">{{ reorder.announcement.value }}</text>
  </view>
</template>

<style scoped lang="scss">
.mobile-evidence {
  display: grid;
  min-width: 0;
  gap: 12px;
}
.mobile-evidence__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: start;
  gap: 8px;
}
.mobile-evidence__status {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  width: 100%;
}
.mobile-evidence__status--overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  pointer-events: none;
}
.mobile-evidence__status--overlay :deep(.mobile-action) {
  pointer-events: auto;
}
.mobile-evidence--overlay-remove .mobile-evidence__grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}
.mobile-evidence--overlay-remove .mobile-evidence__item {
  position: relative;
  display: block;
  box-sizing: border-box;
  flex: 0 0 112px;
  width: 112px;
  height: 112px;
}
.mobile-evidence--overlay-remove .mobile-evidence__item--original { height: auto; }
.mobile-evidence--overlay-remove .mobile-evidence__item--original .mobile-evidence__status--overlay { bottom: 44px; }
.mobile-evidence--overlay-remove .mobile-action.mobile-evidence__preview {
  width: 100%;
  height: 100%;
  min-height: 0;
  aspect-ratio: auto;
}
.mobile-evidence--overlay-remove .mobile-evidence__item--original .mobile-action.mobile-evidence__preview {
  height: auto;
  aspect-ratio: 1;
}
.mobile-evidence--overlay-remove .mobile-action.mobile-evidence__remove {
  position: absolute;
  right: 0;
  top: 0;
  z-index: 3;
  width: 48px;
  height: 48px;
  min-height: 48px;
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mobile-evidence--horizontal .mobile-evidence__grid {
  flex-wrap: nowrap;
  min-width: 100%;
}
.mobile-evidence--overlay-remove .mobile-action:focus-visible { outline-offset: -2px; }
/* The complete 48px target stays inside its own 112px tile. It cannot cover
   the preview centre, adjacent attachments, a field label or the next row. */
.mobile-evidence__remove-mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: #fff;
  background: #173b3be6;
  border: 1px solid #ffffff80;
  border-radius: 50%;
}
.mobile-evidence__item {
  min-width: 0;
  display: grid;
  grid-template-rows: auto;
  border: 1px solid
    var(
      --mobile-workspace-line,
      var(--tms-line-subtle, var(--smis-line-subtle))
    );
  border-radius: 12px;
  background: var(--tms-surface-soft, var(--smis-surface-soft));
}
.mobile-action.mobile-evidence__preview {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  min-height: 64px;
  overflow: hidden;
  border-radius: 11px;
  line-height: 0;
}
.mobile-evidence__image {
  display: block;
  width: 100%;
  height: 100%;
}
.mobile-evidence__fallback {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 2px;
  height: 100%;
  padding: 4px 2px;
  color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted)));
  font-size: 12px;
  line-height: 1.2;
}
.mobile-evidence__retry-copy,
.mobile-action.mobile-evidence__original {
  color: var(
    --mobile-workspace-accent,
    var(--tms-primary, var(--smis-primary))
  );
  font-weight: 650;
}
.mobile-action.mobile-evidence__original {
  display: grid;
  place-items: center;
  width: 100%;
  height: auto;
  min-height: 44px;
  padding: 4px 2px;
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
}
.mobile-action.mobile-evidence__remove {
  position: relative;
  width: 100%;
  height: auto;
  border-top: 1px solid
    var(
      --mobile-workspace-line,
      var(--tms-line-subtle, var(--smis-line-subtle))
    );
  border-radius: 0 0 11px 11px;
  background: transparent;
  color: var(--tms-text-secondary, var(--smis-text-secondary));
}
.mobile-action.mobile-evidence__add {
  --mobile-inline-pair-gap: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px dashed
    var(--mobile-workspace-line, var(--tms-line, var(--smis-line)));
  border-radius: 12px;
  background: var(--tms-surface-soft, var(--smis-surface-soft));
  color: var(
    --mobile-workspace-accent,
    var(--tms-primary, var(--smis-primary))
  );
  font-size: max(25rpx, 13px);
  font-weight: 650;
}
.mobile-evidence--reorderable .mobile-evidence__preview { cursor: grab; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.mobile-evidence__item--dragging { position: relative; opacity: .9; box-shadow: 0 4px 16px #0004; }
.mobile-evidence__item--dragging .mobile-evidence__preview { cursor: grabbing; }
.mobile-evidence__item--target { outline: 3px solid var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary))); outline-offset: 2px; }
.mobile-evidence__announcement { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
