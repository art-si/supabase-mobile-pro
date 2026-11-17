<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import MobileIcon from './MobileIcon.vue'
import MobileInlineLabel from './MobileInlineLabel.vue'

defineOptions({ options: { styleIsolation: 'shared' } })

const props = withDefaults(defineProps<{
  images: readonly string[]
  label: string
  uploadLabel?: string
  limit?: number
  uploading?: boolean
  disabled?: boolean
  readonly?: boolean
}>(), { uploadLabel: '拍照上传', limit: 5 })

const emit = defineEmits<{ preview: [index: number]; remove: [index: number]; upload: []; 'image-error': [index: number] }>()
const unavailable = computed(() => props.disabled || props.uploading)

interface Thumbnail {
  url: string
  key: string
  failed: boolean
  onError: () => void
}

const thumbnails = ref<Thumbnail[]>([])

function createThumbnail(url: string, index: number): Thumbnail {
  const item = reactive<Thumbnail>({
    url,
    key: `${url}-${index}`,
    failed: false,
    onError() {
      if (thumbnails.value[index] !== item || item.failed) return
      item.failed = true
      emit('image-error', index)
    }
  })
  return item
}

watch(() => [...props.images], (images) => {
  thumbnails.value = images.map((url, index) => {
    const existing = thumbnails.value[index]
    return existing?.url === url ? existing : createThumbnail(url, index)
  })
}, { immediate: true })

function openThumbnail(index: number) {
  const thumbnail = thumbnails.value[index]
  if (!thumbnail) return
  if (thumbnail.failed) thumbnails.value[index] = createThumbnail(thumbnail.url, index)
  else emit('preview', index)
}

function remove(index: number) {
  if (!unavailable.value) emit('remove', index)
}

function upload() {
  if (!unavailable.value) emit('upload')
}
</script>

<template>
  <view class="mobile-evidence">
    <view v-if="thumbnails.length" class="mobile-evidence__grid">
      <view v-for="(thumbnail, index) in thumbnails" :key="thumbnail.key" class="mobile-evidence__item">
        <button
          class="mobile-action mobile-evidence__preview tms-evidence-preview"
          role="button"
          tabindex="0"
          :aria-label="thumbnail.failed ? `缩略图加载失败，重新加载第 ${index + 1} 张${label}` : `预览第 ${index + 1} 张${label}`"
          hover-class="mobile-action--pressed"
          @click="openThumbnail(index)"
          @keydown="preventActionKey"
          @keyup="activateActionKey($event, () => openThumbnail(index))"
        >
          <view v-if="thumbnail.failed" class="mobile-evidence__fallback" aria-hidden="true">
            <MobileIcon name="photo" size="16px" />
            <text>加载失败</text>
            <text class="mobile-evidence__retry-copy">重试加载</text>
          </view>
          <image v-else class="mobile-evidence__image" :src="thumbnail.url" mode="aspectFill" lazy-load aria-hidden="true" @error="thumbnail.onError" />
        </button>
        <button
          v-if="thumbnail.failed"
          class="mobile-action mobile-evidence__original"
          role="button"
          tabindex="0"
          :aria-label="`预览第 ${index + 1} 张${label}原图`"
          hover-class="mobile-action--pressed"
          @click="$emit('preview', index)"
          @keydown="preventActionKey"
          @keyup="activateActionKey($event, () => $emit('preview', index))"
        >预览原图</button>
        <slot name="status" :index="index" />
        <button
          v-if="!readonly"
          class="mobile-action mobile-action--icon mobile-evidence__remove tms-evidence-remove"
          role="button"
          :tabindex="unavailable ? -1 : 0"
          :aria-label="`删除第 ${index + 1} 张${label}`"
          :disabled="unavailable"
          :aria-disabled="unavailable || undefined"
          hover-class="mobile-action--pressed"
          @click="remove(index)"
          @keydown="preventActionKey"
          @keyup="activateActionKey($event, () => remove(index))"
        >
          <MobileIcon name="close" size="16px" />
        </button>
      </view>
    </view>
    <button
      v-if="!readonly && images.length < props.limit"
      class="mobile-action mobile-evidence__add evidence-grid__add"
      role="button"
      :tabindex="unavailable ? -1 : 0"
      :disabled="unavailable"
      :aria-disabled="unavailable || undefined"
      :aria-busy="uploading"
      hover-class="mobile-action--pressed"
      @click="upload"
      @keydown="preventActionKey"
      @keyup="activateActionKey($event, upload)"
    >
      <MobileInlineLabel icon="camera" icon-size="18px" :label="uploading ? '正在处理…' : uploadLabel" />
    </button>
  </view>
</template>

<style scoped lang="scss">
.mobile-evidence { display: grid; min-width: 0; gap: 8px; }
.mobile-evidence__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; gap: 8px; }
.mobile-evidence__item {
  min-width: 0;
  display: grid;
  grid-template-rows: auto;
  border: 1px solid var(--mobile-workspace-line, var(--tms-line-subtle, var(--smis-line-subtle)));
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
.mobile-evidence__image { display: block; width: 100%; height: 100%; }
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
  color: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
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
  border-top: 1px solid var(--mobile-workspace-line, var(--tms-line-subtle, var(--smis-line-subtle)));
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
  border: 1px dashed var(--mobile-workspace-line, var(--tms-line, var(--smis-line)));
  border-radius: 12px;
  background: var(--tms-surface-soft, var(--smis-surface-soft));
  color: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  font-size: max(25rpx, 13px);
  font-weight: 650;
}
</style>
