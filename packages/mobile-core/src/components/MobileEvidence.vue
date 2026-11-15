<script setup lang="ts">
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'

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

defineEmits<{ preview: [index: number]; remove: [index: number]; upload: [] }>()
</script>

<template>
  <view class="mobile-evidence">
    <view v-if="images.length" class="mobile-evidence__grid">
      <view v-for="(url, index) in images" :key="`${url}-${index}`" class="mobile-evidence__item">
        <MobileAction class="mobile-evidence__preview tms-evidence-preview" :aria-label="`预览第 ${index + 1} 张${label}`" @click="$emit('preview', index)">
          <image :src="url" mode="aspectFill" aria-hidden="true" />
        </MobileAction>
        <MobileAction
          v-if="!readonly"
          class="mobile-evidence__remove tms-evidence-remove"
          :aria-label="`删除第 ${index + 1} 张${label}`"
          :disabled="disabled || uploading"
          @click="$emit('remove', index)"
        >
          <MobileIcon name="close" size="16px" />
        </MobileAction>
      </view>
    </view>
    <MobileAction
      v-if="!readonly && images.length < props.limit"
      class="mobile-evidence__add evidence-grid__add"
      :disabled="disabled || uploading"
      :aria-busy="uploading"
      @click="$emit('upload')"
    >
      <MobileIcon name="camera" size="18px" />
      <text>{{ uploading ? '正在处理…' : uploadLabel }}</text>
    </MobileAction>
  </view>
</template>

<style scoped lang="scss">
.mobile-evidence { display: grid; min-width: 0; gap: 8px; }
.mobile-evidence__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.mobile-evidence__item {
  min-width: 0;
  display: grid;
  grid-template-rows: auto;
  border: 1px solid var(--mobile-workspace-line, var(--tms-line-subtle));
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
.mobile-evidence__preview image { display: block; width: 100%; height: 100%; }
.mobile-action.mobile-evidence__remove {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 44px;
  height: auto;
  border-top: 1px solid var(--mobile-workspace-line, var(--tms-line-subtle));
  border-radius: 0 0 11px 11px;
  background: transparent;
  color: var(--tms-text-secondary, var(--smis-text-secondary));
}
.mobile-action.mobile-evidence__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px dashed var(--mobile-workspace-line, var(--tms-line));
  border-radius: 12px;
  background: var(--tms-surface-soft, var(--smis-surface-soft));
  color: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  font-size: max(25rpx, 13px);
  font-weight: 650;
}
</style>
