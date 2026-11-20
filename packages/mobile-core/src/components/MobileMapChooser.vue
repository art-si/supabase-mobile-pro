<script setup lang="ts">
import { activateActionKey, preventActionKey } from '../action-keyboard'
import MobileBottomSheet from './MobileBottomSheet.vue'
import type { MapProvider } from '../map-links'
defineOptions({ options: { styleIsolation: 'apply-shared' } })
const visible = defineModel<boolean>({ required: true })
withDefaults(defineProps<{ place: string; hint?: string; fallback?: boolean; message?: string; title?: string }>(), { title: '在地图中查看' })
defineEmits<{ open: [provider: MapProvider, webOnly: boolean]; copy: [] }>()
</script>
<template>
  <MobileBottomSheet v-model="visible" :title="title" close-label="关闭地图选择" :z-index="60">
    <view class="mobile-map-chooser">
      <text class="mobile-map-chooser__place">{{ place }}</text>
      <text v-if="hint" class="mobile-map-chooser__note">{{ hint }}</text>
      <view class="mobile-action-group">
        <button class="mobile-action mobile-map-chooser__action" role="button" tabindex="0" hover-class="mobile-action--pressed" @click="$emit('open','amap',false)" @keydown="preventActionKey" @keyup="activateActionKey($event, () => $emit('open','amap',false))">高德地图</button>
        <button class="mobile-action mobile-map-chooser__action" role="button" tabindex="0" hover-class="mobile-action--pressed" @click="$emit('open','baidu',false)" @keydown="preventActionKey" @keyup="activateActionKey($event, () => $emit('open','baidu',false))">百度地图</button>
      </view>
      <text v-if="message" class="mobile-map-chooser__note" role="status">{{ message }}</text>
      <template v-if="fallback">
        <view class="mobile-action-group">
          <button class="mobile-action mobile-map-chooser__action" role="button" tabindex="0" hover-class="mobile-action--pressed" @click="$emit('open','amap',true)" @keydown="preventActionKey" @keyup="activateActionKey($event, () => $emit('open','amap',true))">高德网页版</button>
          <button class="mobile-action mobile-map-chooser__action" role="button" tabindex="0" hover-class="mobile-action--pressed" @click="$emit('open','baidu',true)" @keydown="preventActionKey" @keyup="activateActionKey($event, () => $emit('open','baidu',true))">百度网页版</button>
        </view>
      </template>
      <button class="mobile-action mobile-map-chooser__copy" role="button" tabindex="0" hover-class="mobile-action--pressed" @click="$emit('copy')" @keydown="preventActionKey" @keyup="activateActionKey($event, () => $emit('copy'))">复制地点</button>
    </view>
  </MobileBottomSheet>
</template>
<style scoped>
.mobile-map-chooser { display: grid; gap: 16px; padding: 16px; min-width: 0; }
.mobile-map-chooser__place { color: var(--tms-text); font-size: 1rem; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.mobile-map-chooser__note { color: var(--tms-muted); font-size: .875rem; line-height: 1.5; overflow-wrap: anywhere; }
.mobile-map-chooser__action.mobile-action { padding: 12px; border-radius: 14px; background: var(--tms-primary-soft); color: var(--tms-primary); font-weight: 600; }
.mobile-map-chooser__copy.mobile-action { display: flex; align-items: center; justify-content: center; min-height: var(--tms-control-height,48px); padding: 8px; font-size: 1rem; line-height: 1.5; color: var(--tms-primary); }
</style>
