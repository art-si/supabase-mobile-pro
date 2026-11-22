<script setup lang="ts">
import { getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MapFence, MapPoint, MobileMapInstance, MobileMapPolygon, MobileMapSdk } from '../map'

defineOptions({ options: { styleIsolation: 'apply-shared' } })
const props = withDefaults(defineProps<{
  load: () => Promise<MobileMapSdk>
  label?: string
  options?: Record<string, unknown>
  reloadKey?: string | number
  fences?: MapFence[]
  draft?: MapPoint[]
  selectedFence?: string
  fenceColor?: string
}>(), { label: '互动地图' })
const emit = defineEmits<{
  ready: [map: MobileMapInstance, sdk: MobileMapSdk]
  loading: [value: boolean]
  error: [cause: unknown]
  fence: [id: string]
  interact: []
}>()
const id = `mobile-map-${getCurrentInstance()!.uid}`
const root = ref<HTMLElement | { $el: HTMLElement }>()
const pending = ref(true)
let map: MobileMapInstance | undefined, sdk: MobileMapSdk | undefined
let overlays: unknown[] = [], preview: unknown[] = []
const fenceLabels = new Map<string, { button: HTMLButtonElement; polygons: MobileMapPolygon[] }>()
let mounted = false, version = 0
let resize: ResizeObserver | undefined
let loadTimer: ReturnType<typeof setTimeout> | undefined
function clear() {
  version++
  clearTimeout(loadTimer)
  resize?.disconnect()
  resize = undefined
  map?.destroy()
  map = undefined
  overlays = []
  fenceLabels.clear()
  preview = []
}
async function reload() {
  clear()
  if (!mounted) return
  const current = version
  pending.value = true
  emit('loading', true)
  try {
    const provider = await props.load()
    await nextTick()
    if (!mounted || current !== version) return
    sdk = provider
    map = new provider.Map(id, {
      zoom: 10, viewMode: '2D', animateEnable: false, resizeEnable: true,
      ...props.options
    })
    const instance = map
    const finish = () => {
      if (!mounted || current !== version) return
      pending.value = false
      clearTimeout(loadTimer)
      emit('loading', false)
    }
    instance.on('complete', finish)
    loadTimer = setTimeout(() => {
      if (!mounted || current !== version || !pending.value) return
      finish()
      emit('error', new Error('地图加载超时，请重新加载。'))
    }, 15000)
    const node = root.value && ('$el' in root.value ? root.value.$el : root.value)
    if (node && typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(() => {
        // The provider owns resizing; keep overlays aligned after responsive layout changes.
        if (map === instance) drawDraft()
      })
      resize.observe(node)
    }
    drawFences()
    drawDraft()
    emit('ready', instance, provider)
  } catch (cause) {
    if (mounted && current === version) { pending.value = false; emit('loading', false); emit('error', cause) }
  }
}
function updateFenceSelection() {
  for (const [id, { button, polygons }] of fenceLabels) {
    const selected = props.selectedFence === id
    const pressed = String(selected)
    if (button.getAttribute('aria-pressed') === pressed) continue
    button.setAttribute('aria-pressed', pressed)
    for (const polygon of polygons) polygon.setOptions({
      strokeWeight: selected ? 4 : 2,
      fillOpacity: selected ? 0.23 : 0.13
    })
  }
}
function drawFences() {
  if (!map || !sdk) return
  map.remove(overlays)
  overlays = []
  fenceLabels.clear()
  const node = root.value && ('$el' in root.value ? root.value.$el : root.value)
  const color = props.fenceColor || (node ? getComputedStyle(node).getPropertyValue('--mobile-map-fence-color').trim() : '')
  for (const fence of props.fences || []) {
    const selected = props.selectedFence === fence.id
    const polygons: MobileMapPolygon[] = []
    for (const path of fence.paths) {
      const polygon = new sdk.Polygon({
        path, strokeColor: color || '#B42331', strokeWeight: selected ? 4 : 2,
        strokeStyle: fence.dashed ? 'dashed' : 'solid', fillColor: color || '#B42331',
        fillOpacity: selected ? 0.23 : 0.13, zIndex: 40, bubble: false
      })
      polygon.on('click', () => emit('fence', fence.id))
      polygons.push(polygon)
      overlays.push(polygon)
    }
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'mobile-map__fence-label'
    button.setAttribute('aria-label', fence.label)
    button.setAttribute('aria-pressed', String(selected))
    button.textContent = '禁钓'
    button.addEventListener('click', (event) => { event.stopPropagation(); emit('fence', fence.id) })
    fenceLabels.set(fence.id, { button, polygons })
    overlays.push(new sdk.Marker({
      position: fence.point, content: button, anchor: 'center', offset: new sdk.Pixel(0, 0),
      zIndex: 70, bubble: false
    }))
  }
  map.add(overlays)
}
function drawDraft() {
  if (!map || !sdk) return
  map.remove(preview)
  preview = []
  const path = props.draft || []
  if (!path.length) return
  const node = root.value && ('$el' in root.value ? root.value.$el : root.value)
  const color = props.fenceColor || (node ? getComputedStyle(node).getPropertyValue('--mobile-map-fence-color').trim() : '')
  if (path.length >= 3) preview.push(new sdk.Polygon({
    path, strokeColor: color || '#B42331', strokeWeight: 3, fillColor: color || '#B42331',
    fillOpacity: 0.15, zIndex: 60, bubble: true
  }))
  else if (path.length > 1) preview.push(new sdk.Polyline({
    path, strokeColor: color || '#B42331', strokeWeight: 3, zIndex: 60, bubble: true
  }))
  for (const [index, point] of path.entries()) {
    const dot = document.createElement('span')
    dot.className = 'mobile-map__vertex'
    dot.textContent = String(index + 1)
    preview.push(new sdk.Marker({
      position: point, content: dot, anchor: 'center', offset: new sdk.Pixel(0, 0),
      zIndex: 80, bubble: true
    }))
  }
  map.add(preview)
}
onMounted(() => { mounted = true; void reload() })
watch(() => props.reloadKey, () => { void reload() })
watch(() => [props.fences, props.fenceColor], drawFences, { deep: true })
watch(() => props.selectedFence, updateFenceSelection)
watch(() => props.draft, drawDraft, { deep: true })
onBeforeUnmount(() => { mounted = false; clear() })
function fitFences() { if (map && overlays.length) map.setFitView(overlays, true, [32, 32, 32, 32], 17) }
defineExpose({ reload, fitFences })
</script>

<template>
  <view ref="root" class="mobile-map">
    <view :id="id" class="mobile-map__canvas" role="region" :aria-label="label" @pointerdown="emit('interact')" @wheel.passive="emit('interact')" @keydown="emit('interact')" />
    <view v-if="pending" class="mobile-map__loading" role="status"><slot name="loading"><text>正在加载地图…</text></slot></view>
    <view v-if="$slots.search" class="mobile-map__search"><slot name="search" /></view>
    <view v-if="$slots.controls" class="mobile-map__controls"><slot name="controls" /></view>
    <view v-if="$slots.status" class="mobile-map__status"><slot name="status" /></view>
    <view v-if="$slots.selection" class="mobile-map__selection"><slot name="selection" /></view>
  </view>
</template>

<style scoped>
.mobile-map { position: relative; width: 100%; height: var(--mobile-map-height, 100%); min-height: 220px; isolation: isolate; background: var(--mobile-workspace-canvas); overflow: hidden; }
.mobile-map__canvas { position: absolute; inset: 0; }
.mobile-map__search { position: absolute; inset: 12px 12px auto; z-index: 110; max-width: var(--mobile-map-search-max-width, 360px); }
.mobile-map__loading { position: absolute; inset: 0; display: grid; place-items: center; z-index: 90; background: var(--mobile-workspace-canvas); color: var(--mobile-workspace-muted); pointer-events: none; }
.mobile-map__controls { position: absolute; right: 12px; bottom: max(30px, env(safe-area-inset-bottom)); z-index: 100; display: flex; flex-direction: column; gap: 10px; }
.mobile-map__status { position: absolute; top: 76px; left: 12px; right: 72px; z-index: 95; max-width: 360px; pointer-events: none; }
.mobile-map__status:empty { display: none; }
.mobile-map__selection { position: absolute; left: 12px; right: 12px; bottom: max(30px, env(safe-area-inset-bottom)); z-index: 101; max-width: 420px; }
.mobile-map :deep(.mobile-map__pin) { display: block; width: 32px; height: 42px; color: var(--mobile-workspace-accent); filter: drop-shadow(0 2px 3px #0005); }
.mobile-map :deep(.mobile-map__fence-label) { display: grid; place-items: center; box-sizing: border-box; min-width: 48px; min-height: 48px; margin: 0; padding: 4px 10px; border: 2px solid var(--mobile-workspace-surface); border-radius: 12px; background: var(--mobile-workspace-surface); color: var(--mobile-map-fence-color, #B42331); font: 700 max(14px, 0.875rem)/1.4 sans-serif; white-space: nowrap; box-shadow: 0 1px 6px #0003; cursor: pointer; }
.mobile-map :deep(.mobile-map__fence-label[aria-pressed='true']), .mobile-map :deep(.mobile-map__fence-label:focus-visible) { outline: 3px solid currentColor; outline-offset: 2px; }
.mobile-map :deep(.mobile-map__vertex) { display: grid; place-items: center; width: 24px; height: 24px; border: 2px solid white; border-radius: 50%; background: var(--mobile-map-fence-color, #B42331); color: white; font: 700 12px/1 sans-serif; }
@media (orientation: landscape) and (max-height: 500px) { .mobile-map__search { --mobile-search-suggestions-height: 38dvh; } }
</style>
