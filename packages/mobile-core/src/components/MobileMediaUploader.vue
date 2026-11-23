<script setup lang="ts">
import { preventActionKey, activateButtonKey } from '../action-keyboard'
import { computed, onBeforeUnmount, ref, watch } from "vue";
import MobileEvidence from "./MobileEvidence.vue";
import MobileBottomSheet from "./MobileBottomSheet.vue";
import MobileIcon from "./MobileIcon.vue";
import MobileVideoViewer from "./MobileVideoViewer.vue";
import MobileImagePreview from "./MobileImagePreview.vue";
import { chooseMediaFiles, type MediaChooseSource, type ChosenMedia } from "../media-choose";
import { createUploadQueue } from "../upload-queue";
import { captureVideoPoster, clearVideoPosterScope, rememberVideoPoster } from "../video-poster";
import type { UploadOptions } from "../upload-progress";
import type { MediaUploadEntry, UploadedMedia } from "../media-upload";
defineOptions({ options: { styleIsolation: "apply-shared" } });
const props = withDefaults(
  defineProps<{
    limit?: number;
    accept?: readonly ("image" | "video")[];
    maxImageBytes?: number;
    maxVideoBytes?: number;
    uploadImage: (
      path: string,
      options: UploadOptions,
    ) => Promise<UploadedMedia>;
    uploadVideo?: (
      path: string,
      options: UploadOptions,
    ) => Promise<UploadedMedia>;
    errorText: (error: unknown) => string;
    recovery?: (error: unknown) => "login" | "retry" | "remove";
    scope: string | number;
    /** Optional account boundary when the upload queue scope also contains a record id. */
    posterScope?: string | number;
    disabled?: boolean;
    active?: boolean;
    uploadLabel?: string;
    hideAddButton?: boolean;
    compact?: boolean;
    /** Host-owned native camera adapter; shared components have no plugin dependency. */
    cameraPicker?: () => Promise<ChosenMedia[]>;
    /** Optional lifecycle-aware picker for both album and camera selections. */
    mediaPicker?: (count: number, accept: readonly ("image" | "video")[], source?: MediaChooseSource) => Promise<ChosenMedia[]>;
  }>(),
  {
    limit: 9,
    accept: () => ["image"],
    active: true,
    maxImageBytes: 8 * 1024 * 1024,
    maxVideoBytes: 20 * 1024 * 1024,
    uploadLabel: "添加图片",
  },
);
const items = defineModel<MediaUploadEntry[]>({ required: true });
const emit = defineEmits<{
  change: [];
  login: [];
  notice: [message: string];
}>();
const choosing = ref(false),
  preview = ref<MediaUploadEntry | null>(null),
  videoOpen = ref(false);
const selectionNotice = ref("");
const selectionHint = computed(() => [...new Set(items.value.map(item => item.notice).filter(Boolean))].join('；'));
const imageViewer = ref<InstanceType<typeof MobileImagePreview>>();
const previewTrigger = ref<HTMLElement | null>(null);
const uploading = computed(() =>
  items.value.some((p) => p.busy || (!p.asset && !p.error)),
);
const kind = (p: MediaUploadEntry) => p.kind || p.asset?.kind || "image";
const previewPath = (p: MediaUploadEntry) => p.previewPath || p.path;
const preparedPreviews = new Map<MediaUploadEntry, { path: string; dispose: () => void }>();
const wrappedReleases = new WeakSet<MediaUploadEntry>();
function clearPrepared(item: MediaUploadEntry) {
  const prepared = preparedPreviews.get(item);
  if (!prepared) return;
  preparedPreviews.delete(item);
  if (item.previewPath === prepared.path) item.previewPath = undefined;
  prepared.dispose();
}
function clearAllPrepared() { for (const item of preparedPreviews.keys()) clearPrepared(item); }
function retainPrepared(item: MediaUploadEntry, prepared: { path: string; dispose: () => void }) {
  if (!prepared.path || prepared.path === item.path) return false;
  clearPrepared(item);
  preparedPreviews.set(item, prepared);
  item.previewPath = prepared.path;
  if (!wrappedReleases.has(item)) {
    const releaseOriginal = item.release;
    item.release = () => { clearPrepared(item); releaseOriginal?.(); };
    wrappedReleases.add(item);
  }
  return true;
}
let disposed = false;
let selectionVersion = 0;
const queue = createUploadQueue<MediaUploadEntry>(async (item, signal) => {
  if (disposed || signal.aborted || !props.active || props.disabled || !items.value.includes(item)) return;
  const scope = props.scope;
  const current = () =>
    !disposed &&
    props.active &&
    !signal.aborted &&
    scope === props.scope &&
    items.value.includes(item);
  item.busy = true;
  item.error = "";
  item.progress = undefined;
  item.stage = undefined;
  item.preparationProgress = undefined;
  item.needsLogin = false;
  clearPrepared(item);
  try {
    const upload =
      kind(item) === "video" ? props.uploadVideo : props.uploadImage;
    if (!upload) throw new Error("此处不支持视频");
    const asset = await upload(item.path, {
      signal,
      onProgress: (value) => {
        if (current()) { item.stage = 'uploading'; item.progress = value; }
      },
      onStage: (stage) => {
        if (current()) { item.stage = stage; if (stage === 'uploading') item.preparationProgress = undefined; }
      },
      onPreparationProgress: (value) => {
        if (current() && Number.isFinite(value)) { item.stage = 'preparing'; item.preparationProgress = Math.max(0, Math.min(100, value)); }
      },
      onPreparedMedia: (prepared) => current() && retainPrepared(item, prepared),
    });
    if (!current()) return;
    item.asset = asset;
    item.duration = asset.duration ?? item.duration;
    if (item.poster) rememberVideoPoster(item.poster, { scope: props.posterScope ?? props.scope, cacheKey: asset.id });
    emit("change");
  } catch (error) {
    if (!current()) return;
    item.error = props.errorText(error);
    const recovery = props.recovery?.(error) || "retry";
    item.needsLogin = recovery === "login";
    item.retryable = recovery === "retry";
    if (item.needsLogin) queue.pause();
  } finally {
    if (current()) { item.busy = false; item.stage = undefined; item.preparationProgress = undefined; }
  }
}, 3);
function enqueuePending() {
  for (const item of preparedPreviews.keys()) if (!items.value.includes(item)) clearPrepared(item);
  if (props.active && !props.disabled)
    for (const item of items.value)
      if (!item.asset && !item.error) queue.enqueue(item);
}
watch(
  () =>
    items.value
      .map(
        (p) => `${p.key}:${p.asset ? "done" : p.error ? "failed" : "pending"}`,
      )
      .join("|"),
  enqueuePending,
  { immediate: true, flush: "post" },
);
watch(
  () => props.scope,
  () => {
    selectionVersion++;
    queue.clear();
    clearAllPrepared();
    videoOpen.value = false;
    enqueuePending();
  },
  { flush: "sync" },
);
watch(
  () => props.disabled,
  (value) => {
    if (value) queue.pause();
    else if (props.active) {
      queue.resume();
      enqueuePending();
    }
  },
);
watch(
  () => props.active,
  (value) => {
    if (!value) {
      selectionVersion++;
      videoOpen.value = false;
      selectionNotice.value = '';
      cancelPending();
    } else if (!props.disabled) {
      queue.resume();
      enqueuePending();
    }
  },
  { flush: 'sync' },
);
function cancelPending() {
  queue.clear();
  queue.pause();
  for (const item of items.value) {
    if (item.asset || (item.error && !item.busy)) continue;
    clearPrepared(item);
    item.busy = false;
    item.progress = undefined;
    item.stage = undefined;
    item.preparationProgress = undefined;
    item.error = '上传已暂停，点击重试继续';
    item.retryable = true;
    item.needsLogin = false;
  }
}
watch(
  () => [props.scope, props.posterScope, props.active, items.value.map((p) => `${p.key}:${previewPath(p)}:${p.asset?.id || ''}`).join("|")],
  (_value, _old, onCleanup) => {
    if (!props.active) return;
    const scope = props.scope;
    const posterScope = props.posterScope ?? scope;
    const controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
    onCleanup(() => controller?.abort());
    for (const item of items.value) {
      if (kind(item) !== 'video') continue;
      if (item.poster && item.asset) rememberVideoPoster(item.poster, { scope: posterScope, cacheKey: item.asset.id });
      if (!item.poster && previewPath(item))
        void captureVideoPoster(previewPath(item), { scope: posterScope, cacheKey: item.asset?.id || item.key, signal: controller?.signal }).then((poster) => {
          if (
            !disposed &&
            !controller?.signal.aborted &&
            scope === props.scope &&
            items.value.includes(item) &&
            poster
          ) {
            item.poster = poster;
            if (item.asset) rememberVideoPoster(poster, { scope: posterScope, cacheKey: item.asset.id });
          }
        });
    }
  },
  { immediate: true, flush: "post" },
);
watch(() => props.posterScope ?? props.scope, (_scope, previous) => clearVideoPosterScope(previous), { flush: 'sync' });
async function add(source?: MediaChooseSource) {
  if (disposed || choosing.value || !props.active || props.disabled || items.value.length >= props.limit || (source === 'camera' && !props.accept.includes('image')))
    return;
  choosing.value = true;
  const scope = props.scope;
  const selection = ++selectionVersion;
  selectionNotice.value = "";
  try {
    const chosen = props.mediaPicker ? await props.mediaPicker(props.limit - items.value.length, props.accept, source)
      : source === 'camera' && props.cameraPicker
      ? await props.cameraPicker()
      : await chooseMediaFiles(props.limit - items.value.length, props.accept, source);
    if (disposed || !props.active || props.disabled || scope !== props.scope || selection !== selectionVersion) {
      chosen.forEach((p) => p.release?.());
      return;
    }
    if (items.value.length + chosen.length > props.limit || (source === 'camera' && chosen.length > 1)) {
      chosen.forEach((p) => p.release?.());
      selectionNotice.value = source === 'camera' && chosen.length > 1 ? '每次拍照只能添加 1 张照片' : `最多添加 ${props.limit} 项，请重新选择`;
      return;
    }
    const next: MediaUploadEntry[] = [],
      messages: string[] = [];
    for (const media of chosen) {
      const maximum =
        media.kind === "video" ? props.maxVideoBytes : props.maxImageBytes;
      if (
        !props.accept.includes(media.kind) || (source === 'camera' && media.kind !== 'image') ||
        !Number.isFinite(media.size) ||
        media.size <= 0 ||
        media.size > maximum
      ) {
        media.release?.();
        messages.push(
          media.size > maximum
            ? `${media.kind === "video" ? "视频" : "图片"}不能超过 ${maximum / 1024 / 1024}MB，请选择较小的${media.kind === "video" ? "视频" : "图片"}`
            : "所选文件格式暂不支持",
        );
        continue;
      }
      next.push({
        key: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...media,
        busy: false,
        error: "",
      });
    }
    items.value = [...items.value, ...next];
    emit("change");
    if (messages.length)
      selectionNotice.value = [...new Set(messages)].join("；");
  } catch (error) {
    if (!disposed && props.active && scope === props.scope && selection === selectionVersion)
      selectionNotice.value = props.errorText(error);
  } finally {
    choosing.value = false;
  }
}
function retry(index: number) {
  if (disposed || !props.active || props.disabled) return;
  const item = items.value[index];
  if (!item) return;
  if (item.needsLogin) {
    emit("login");
    return;
  }
  queue.remove(item.key);
  item.error = "";
  queue.resume();
  queue.enqueue(item);
}
function remove(index: number) {
  const item = items.value[index];
  if (!item) return;
  queue.remove(item.key);
  item.release?.();
  items.value = items.value.filter((p) => p !== item);
  emit("change");
}
function open(index: number, event?: Event) {
  const item = items.value[index];
  if (!item) return;
  // #ifdef H5
  const trigger = event?.currentTarget || document.activeElement;
  previewTrigger.value = trigger instanceof HTMLElement ? trigger : null;
  // #endif
  if (kind(item) === 'video') { preview.value = item; videoOpen.value = true; }
  else {
    const images = items.value.filter((p) => kind(p) === 'image' && p.path);
    imageViewer.value?.open(images.map(previewPath), '图片', images.indexOf(item), event);
  }
}
function swap(from: number, to: number) {
  if (props.disabled || from === to || !items.value[from] || !items.value[to]) return;
  const next = [...items.value];
  [next[from],next[to]] = [next[to]!,next[from]!];
  items.value = next; emit('change');
}
const duration = (value = 0) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
const progressLabel = (item: MediaUploadEntry) =>
  !item.busy
    ? "等待上传"
    : item.stage === 'preparing'
      ? item.preparationProgress == null ? '处理中…' : `处理 ${Math.floor(item.preparationProgress)}%`
    : item.progress != null && item.progress < 100
      ? `上传 ${Math.floor(item.progress)}%`
      : "处理中…";
function visibleItem(index: number): MediaUploadEntry[] {
  const item = items.value[index];
  return item ? [item] : [];
}
onBeforeUnmount(() => {
  disposed = true;
  cancelPending();
  clearAllPrepared();
});
defineExpose({ uploading, choosing, choose: add });
</script>
<template>
  <!-- Keep the picker ref mounted, without native placeholder nodes creating empty grid rows. -->
  <view class="mobile-media-uploader" :class="{ 'mobile-media-uploader--compact': compact, 'mobile-media-uploader--empty': !items.length && hideAddButton && !selectionNotice }">
    <MobileEvidence
      :images="items.map(previewPath)"
      :media-kinds="items.map(kind)"
      label="图片"
      :limit="limit"
      :disabled="disabled || choosing"
      :uploading="uploading"
      allow-upload-while-busy
      allow-remove-while-busy
      overlay-remove
      reorderable
      status-overlay
      :upload-label="uploadLabel"
      :hide-add-button="hideAddButton"
      :compact="compact"
      remove-label="移除"
      custom-preview
      @upload="add"
      @remove="remove"
      @preview="open"
      @swap="swap"
    >
      <template #preview="{ index, onError }">
        <template v-for="item in visibleItem(index)" :key="item.key">
          <view class="mobile-media-uploader__preview">
            <image
              v-if="kind(item) === 'image' || item.poster"
              :src="kind(item) === 'video' ? item.poster : previewPath(item)"
              mode="aspectFill"
              class="mobile-media-uploader__image"
              aria-hidden="true"
              @error="onError"
            />
            <view v-else class="mobile-media-uploader__fallback"
              ><MobileIcon name="photo" :size="26"
            /></view>
            <view
              v-if="kind(item) === 'video'"
              class="mobile-media-uploader__play"
              ><wd-icon name="play-circle" size="30px" /><text
                v-if="item.asset"
                >{{ duration(item.duration) }}</text
              ></view
            >
            <view
              v-if="item.busy || (!item.asset && !item.error)"
              class="mobile-media-uploader__progress"
              role="status"
            >
              <view
                v-if="item.busy"
                class="mobile-media-uploader__spinner"
                aria-hidden="true"
              />
              <text>{{ progressLabel(item) }}</text>
            </view>
          </view>
        </template>
      </template>
      <template #status="{ index }">
        <template v-for="item in visibleItem(index)" :key="item.key">
          <button
            v-if="item.needsLogin"
            class="mobile-action mobile-action--link mobile-media-uploader__retry"
            aria-label="登录后继续上传"
            @click="retry(index)"
             role="button" tabindex="0" hover-class="mobile-action--pressed" @keydown="preventActionKey" @keyup="activateButtonKey">去登录</button>
          <button
            v-else-if="item.error && item.retryable !== false"
            class="mobile-action mobile-action--link mobile-media-uploader__retry"
            @click="retry(index)"
             role="button" tabindex="0" hover-class="mobile-action--pressed" @keydown="preventActionKey" @keyup="activateButtonKey">重试上传</button>
          <text v-else-if="item.error" class="mobile-media-uploader__state"
            >请移除重选</text
          >
        </template>
      </template>
    </MobileEvidence>
    <text v-if="selectionHint" class="mobile-media-uploader__hint" role="status">{{ selectionHint }}</text>
    <text
      v-if="selectionNotice"
      class="mobile-media-uploader__error"
      role="alert"
      >{{ selectionNotice }}</text
    >
    <template v-for="(item, index) in items" :key="item.key"
      ><text v-if="item.error" class="mobile-media-uploader__error" role="alert"
        >附件 {{ index + 1 }}：{{ item.error }}</text
      ></template
    >
    <MobileImagePreview ref="imageViewer" />
    <MobileVideoViewer v-model="videoOpen" :src="preview ? previewPath(preview) : ''" :poster="preview?.poster" :trigger="previewTrigger" />

  </view>
</template>
<style scoped>
.mobile-media-uploader {
  display: grid;
  gap: 12px;
  min-width: 0;
}
/* A native hidden attribute can be overridden by the grid display rule. */
.mobile-media-uploader--empty { display: none; }
.mobile-media-uploader__preview {
  position: relative;
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--mobile-workspace-sunken, var(--tms-bg, var(--smis-bg)));
}
.mobile-media-uploader__image,
.mobile-media-uploader__fallback {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}
.mobile-media-uploader__play {
  line-height: 1.35;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #0002;
  text-shadow: 0 1px 3px #000;
  font-size: 12px;
}
.mobile-media-uploader__play text {
  position: absolute;
  right: 5px;
  bottom: 4px;
}
.mobile-media-uploader__progress {
  line-height: 1.35;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #000b;
  color: #fff;
  font-size: max(12px, 0.75rem);
  padding: 4px;
  text-align: center;
}
.mobile-media-uploader__spinner {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff66;
  border-top-color: #fff;
  border-radius: 50%;
  animation: media-spin 0.8s linear infinite;
}
.mobile-media-uploader--compact .mobile-media-uploader__progress { min-height: 24px; padding: 3px 2px; gap: 0; font-size: 12px; white-space: nowrap; }
.mobile-media-uploader--compact .mobile-media-uploader__spinner { display: none; }
.mobile-media-uploader__progress text { min-width: 0; overflow-wrap: anywhere; }
.mobile-media-uploader__done {
  position: absolute;
  right: 5px;
  top: 5px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(
    --mobile-workspace-accent,
    var(--tms-primary, var(--smis-primary))
  );
  color: var(--mobile-workspace-on-accent, #fff);
}
.mobile-media-uploader__retry.mobile-action {
  min-height: 44px;
  padding: 4px;
  width: 100%;
  font-size: 0.8125rem;
  background: #173b3bf0;
  color: #fff;
  border-radius: 0;
}
.mobile-media-uploader__state {
  font-size: 0.8125rem;
  text-align: center;
  color: var(--mobile-workspace-danger, var(--tms-red-strong, #b42318));
}
.mobile-media-uploader__error {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--mobile-workspace-danger, var(--tms-red-strong, #b42318));
  overflow-wrap: anywhere;
}
.mobile-media-uploader__hint { font-size: .8125rem; line-height: 1.5; color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted))); }
.mobile-media-uploader__order.mobile-action {
  justify-self: start;
  min-height: 44px;
}
.mobile-media-uploader__sheet {
  padding: 16px;
  display: grid;
  gap: 12px;
}
.mobile-media-uploader__player {
  width: 100%;
  height: min(55vh, 420px);
  background: #000;
}
.mobile-media-uploader__sort {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}
.mobile-media-uploader__sort-image {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 8px;
}
.mobile-media-uploader__moves {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
@keyframes media-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .mobile-media-uploader__spinner {
    animation: none;
  }
}
</style>
