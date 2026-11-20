<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'
import MobileImagePreview from './MobileImagePreview.vue'
import MobileVideoViewer from './MobileVideoViewer.vue'
import { captureVideoPoster, clearVideoPosterScope } from '../video-poster'
import type { MobileGalleryMedia } from '../gallery-media'

defineOptions({ options: { styleIsolation: 'apply-shared' } })
const props = defineProps<{ media: readonly MobileGalleryMedia[]; label: string; full?: boolean; compact?: boolean; busy?: boolean; scope?: string | number }>()
const emit = defineEmits<{ retry: []; ready: [value: boolean] }>()
const failed = ref<string[]>([]), loaded = ref<string[]>([]), attempt = ref(0)
const posters = ref<Record<string, string>>({})
const posterPending = ref<string[]>([]), posterFailed = ref<string[]>([])
const dimensions = ref<Record<string, { width: number; height: number }>>({})
const selected = shallowRef<MobileGalleryMedia | null>(null), videoOpen = ref(false)
const trigger = shallowRef<HTMLElement | null>(null)
const imageViewer = ref<InstanceType<typeof MobileImagePreview>>()
let version = 0, visible = true
let controller: AbortController | undefined
function stopPosters() { version++; controller?.abort(); controller = undefined; posterPending.value = [] }
function loadPosters(force = false) {
  stopPosters()
  if (!visible) return
  const current = version
  controller = typeof AbortController === 'undefined' ? undefined : new AbortController()
  for (const asset of props.media) {
    if (asset.poster && !force) posters.value[asset.id] = asset.poster
    else if (asset.kind === 'video' && asset.url && (force || !posters.value[asset.id])) {
      posterPending.value.push(asset.id)
      void captureVideoPoster(asset.url, { scope: props.scope, cacheKey: asset.id, signal: controller?.signal, force }).then(poster => {
        if (current !== version) return
        posterPending.value = posterPending.value.filter(id => id !== asset.id)
        if (poster) { posters.value[asset.id] = poster; posterFailed.value = posterFailed.value.filter(id => id !== asset.id) }
        else if (!posterFailed.value.includes(asset.id)) posterFailed.value.push(asset.id)
      })
    }
  }
}
watch(() => [props.scope, props.media.map(asset => `${asset.id}:${asset.url || ''}:${asset.poster || ''}`).join('|')], () => {
  failed.value = []; loaded.value = []; posters.value = {}; dimensions.value = {}
  posterFailed.value = []
  videoOpen.value = false; selected.value = null
  loadPosters()
}, { immediate: true })
watch(() => props.scope, (_scope, previous) => { if (previous != null) clearVideoPosterScope(previous) }, { flush: 'sync' })
onHide(() => { visible = false; stopPosters() })
onShow(() => { if (!visible) { visible = true; loadPosters() } })
onBeforeUnmount(stopPosters)
const ready = computed(() => props.media.every(asset => asset.url && !failed.value.includes(asset.id) && (asset.kind === 'video' || loaded.value.includes(asset.id))))
watch(ready, value => emit('ready', value), { immediate: true })
function ratio(asset: MobileGalleryMedia) {
  const size = dimensions.value[asset.id] || asset
  const width = Number(size.width), height = Number(size.height)
  return width > 0 && height > 0 ? width / height : asset.kind === 'video' ? 16 / 9 : 4 / 3
}
function imageLoaded(asset: MobileGalleryMedia, event: unknown) {
  if (!loaded.value.includes(asset.id)) loaded.value.push(asset.id)
  const detail = (event as { detail?: { width?: number; height?: number } } | null)?.detail
  const width = Number(detail?.width), height = Number(detail?.height)
  if (width > 0 && height > 0) dimensions.value[asset.id] = { width, height }
}
function duration(value?: number) {
  if (!value || !Number.isFinite(value)) return ''
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
}
function open(asset: MobileGalleryMedia) {
  if (!asset.url) return
  if (asset.kind === 'video') {
    // #ifdef H5
    trigger.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // #endif
    selected.value = asset; videoOpen.value = true
  } else {
    const images = props.media.filter(item => item.kind !== 'video' && item.url)
    imageViewer.value?.open(images.map(item => item.url!), props.label, images.findIndex(item => item.id === asset.id))
  }
}
function posterError(asset: MobileGalleryMedia) { delete posters.value[asset.id]; if (!posterFailed.value.includes(asset.id)) posterFailed.value.push(asset.id) }
function retry() { failed.value = []; loaded.value = []; posterFailed.value = []; attempt.value++; loadPosters(true); emit('retry') }
</script>
<template>
  <view class="mobile-media-gallery">
    <view class="mobile-media-gallery__grid" :class="{ 'is-full': full, 'is-single': media.length === 1, 'is-compact': compact }" :aria-label="label">
      <view v-for="(asset,index) in media" :key="`${asset.id}-${asset.url || ''}-${attempt}`" class="mobile-media-gallery__item" :style="{ '--gallery-ratio': String(ratio(asset)) }">
        <MobileAction v-if="asset.url && !failed.includes(asset.id)" class="mobile-media-gallery__preview" :aria-label="asset.kind === 'video' ? `播放视频，第${index + 1}项${duration(asset.duration) ? '，时长' + duration(asset.duration) : ''}` : `${label}，查看大图，第${index + 1}项`" @click="open(asset)">
          <template v-if="asset.kind === 'video'">
            <image v-if="posters[asset.id]" class="mobile-media-gallery__image" :src="posters[asset.id]" :mode="full || (!compact && media.length === 1) ? 'aspectFit' : 'aspectFill'" aria-hidden="true" @load="imageLoaded(asset,$event)" @error="posterError(asset)" />
            <view class="mobile-media-gallery__play" aria-hidden="true"><wd-icon name="play-circle" size="40px" /></view>
            <text v-if="duration(asset.duration)" class="mobile-media-gallery__duration" aria-hidden="true">{{ duration(asset.duration) }}</text>
          </template>
          <image v-else class="mobile-media-gallery__image" :src="asset.url" :mode="full || (!compact && media.length === 1) ? 'aspectFit' : 'aspectFill'" lazy-load aria-hidden="true" @load="imageLoaded(asset,$event)" @error="failed.push(asset.id)" />
        </MobileAction>
        <view v-else class="mobile-media-gallery__unavailable" role="status"><MobileIcon name="photo" size="24px" /><text>{{ asset.kind === 'video' ? '视频暂不可用' : '照片暂不可用' }}</text></view>
      </view>
    </view>
    <text v-if="posterPending.length && !posterFailed.length" class="mobile-media-gallery__status" role="status">正在加载视频封面…</text>
    <view v-if="posterFailed.length" class="mobile-media-gallery__recovery"><text class="mobile-media-gallery__status" role="status">封面暂未加载，可点击播放</text><MobileAction class="mobile-media-gallery__retry" :disabled="busy || !!posterPending.length" @click="retry">{{ busy || posterPending.length ? '正在加载…' : '重新加载封面' }}</MobileAction></view>
    <MobileAction v-if="failed.length || media.some(asset => !asset.url)" class="mobile-media-gallery__retry" :disabled="busy" @click="retry">{{ busy ? '正在读取…' : '重新读取附件' }}</MobileAction>
    <MobileImagePreview ref="imageViewer" />
    <MobileVideoViewer v-model="videoOpen" :src="selected?.url || ''" :poster="selected ? posters[selected.id] : undefined" :trigger="trigger" />
  </view>
</template>
<style scoped>
.mobile-media-gallery { display: grid; gap: 8px; min-width: 0; }
.mobile-media-gallery__grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; min-width: 0; }
.mobile-media-gallery__grid.is-full, .mobile-media-gallery__grid.is-single:not(.is-compact) { grid-template-columns: minmax(0,1fr); }
.mobile-media-gallery__item { position: relative; min-width: 0; aspect-ratio: 1; overflow: hidden; border-radius: 12px; background: var(--tms-surface-muted,var(--tms-bg)); }
.is-full .mobile-media-gallery__item, .is-single:not(.is-compact) .mobile-media-gallery__item { aspect-ratio: var(--gallery-ratio); max-height: 78vh; }
.mobile-media-gallery__preview.mobile-action { display: block; width: 100%; height: 100%; min-width: 0; min-height: 48px; padding: 0; border-radius: inherit; background: transparent; color: var(--mobile-workspace-text,var(--tms-text)); }
.mobile-media-gallery__image { display: block; position: absolute; inset: 0; width: 100%; height: 100%; }
.mobile-media-gallery__play { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; background: #18211edb; color: #fff; }
.mobile-media-gallery__duration { position: absolute; right: 6px; bottom: 6px; border-radius: 4px; background: #18211edb; color: #fff; padding: 1px 5px; font-size: .75rem; line-height: 1.5; font-variant-numeric: tabular-nums; }
.mobile-media-gallery__unavailable { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 96px; height: 100%; gap: 8px; color: var(--mobile-workspace-muted,var(--tms-muted)); font-size: .875rem; padding: 8px; box-sizing: border-box; }
.mobile-media-gallery__retry.mobile-action { justify-self: start; min-height: 48px; padding: 8px 0; color: var(--mobile-workspace-accent,var(--tms-primary)); font-size: .875rem; }
.mobile-media-gallery__status { color: var(--mobile-workspace-muted,var(--tms-muted)); font-size: .8125rem; line-height: 1.5; }
.mobile-media-gallery__recovery { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; column-gap: 12px; }
</style>
