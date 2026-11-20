<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'
import { prepareUploadImage, uploadImageHeader, uploadImageSize, type PreparedUploadImage, type UploadImageNormalizer } from '../image-prepare'

// H5-local canvas editor. Native consumers use the platform cropper instead.
const props = withDefaults(defineProps<{ src: string; maxBytes?: number; notice?: string; normalizeUnsupportedImage?: UploadImageNormalizer }>(), { maxBytes: 8 * 1024 * 1024 })
const emit = defineEmits<{ confirm: [result: { tempFilePath: string }]; cancel: [] }>()
const stage = ref(), loaded = ref(false), failed = ref(false), zoom = ref(1)
let canvas: HTMLCanvasElement | undefined, photo: HTMLImageElement | undefined
let observer: ResizeObserver | undefined, angle = 0, x = 0, y = 0, disposed = false
let prepared: PreparedUploadImage | undefined
const pointers = new Map<number, { x: number; y: number }>()
let last = { x: 0, y: 0 }, start = { x: 0, y: 0 }, moved = false, pinching = false
let pinchDistance = 0, pinchZoom = 1
const edge = 768
const controller = new AbortController()
function displaySize() { return canvas?.getBoundingClientRect().width || edge }
function draw() {
  if (!canvas || !photo || !loaded.value) return
  const width = angle % 180 ? photo.naturalHeight : photo.naturalWidth
  const height = angle % 180 ? photo.naturalWidth : photo.naturalHeight
  const ratio = edge / Math.min(width, height) * zoom.value
  const scale = edge / displaySize()
  x = Math.max(-(width * ratio - edge) / 2 / scale, Math.min((width * ratio - edge) / 2 / scale, x))
  y = Math.max(-(height * ratio - edge) / 2 / scale, Math.min((height * ratio - edge) / 2 / scale, y))
  const context = canvas.getContext('2d')
  if (!context) { failed.value = true; return }
  context.save(); context.fillStyle = '#fff'; context.fillRect(0, 0, edge, edge)
  context.translate(edge / 2 + x * scale, edge / 2 + y * scale)
  context.rotate(angle * Math.PI / 180)
  context.drawImage(photo, -photo.naturalWidth * ratio / 2, -photo.naturalHeight * ratio / 2, photo.naturalWidth * ratio, photo.naturalHeight * ratio)
  context.restore()
}
function magnify(amount: number) { zoom.value = Math.max(1, Math.min(4, zoom.value + amount)); draw() }
function rotate() { angle = (angle + 90) % 360; x = y = 0; draw() }
function point(event: PointerEvent) { return { x: event.clientX, y: event.clientY } }
function distance() { const values = [...pointers.values()]; return Math.hypot(values[0]!.x - values[1]!.x, values[0]!.y - values[1]!.y) }
function down(event: PointerEvent) {
  if (event.button !== 0 || !loaded.value) return
  event.preventDefault(); canvas?.focus({ preventScroll: true }); canvas?.setPointerCapture(event.pointerId)
  pointers.set(event.pointerId, point(event)); last = start = point(event); moved = false
  if (pointers.size === 2) { pinching = true; pinchDistance = distance(); pinchZoom = zoom.value }
}
function move(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return
  event.preventDefault(); pointers.set(event.pointerId, point(event))
  if (pointers.size === 2 && pinchDistance > 0) { zoom.value = Math.max(1, Math.min(4, pinchZoom * distance() / pinchDistance)); moved = true }
  else { x += event.clientX - last.x; y += event.clientY - last.y; moved ||= Math.hypot(event.clientX - start.x, event.clientY - start.y) > 3 }
  last = point(event); draw()
}
function end(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return
  if (!moved && !pinching && pointers.size === 1 && canvas) {
    const box = canvas.getBoundingClientRect()
    x += box.left + box.width / 2 - event.clientX; y += box.top + box.height / 2 - event.clientY; draw()
  }
  pointers.delete(event.pointerId)
  if (!pointers.size) pinching = false
  else last = [...pointers.values()][0]!
}
function key(event: KeyboardEvent) {
  const directions: Record<string, [number, number]> = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }
  if (directions[event.key]) { event.preventDefault(); x += directions[event.key]![0]; y += directions[event.key]![1]; draw() }
  else if (event.key === '+' || event.key === '=') { event.preventDefault(); magnify(.25) }
  else if (event.key === '-') { event.preventDefault(); magnify(-.25) }
  else if (event.key === 'Home') { event.preventDefault(); x = y = 0; zoom.value = 1; draw() }
}
function confirm() {
  if (!canvas || !loaded.value || failed.value) return
  try { emit('confirm', { tempFilePath: canvas.toDataURL('image/jpeg', .88) }) }
  catch { failed.value = true }
}
onMounted(async () => {
  const node = stage.value?.$el || stage.value
  if (!(node instanceof HTMLElement)) return
  canvas = document.createElement('canvas'); canvas.width = canvas.height = edge
  canvas.tabIndex = 0; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', '头像裁剪区域，可用方向键移动照片，加减键缩放')
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:move;outline-offset:4px'
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', event => { pointers.delete(event.pointerId) })
  canvas.addEventListener('keydown', key); node.appendChild(canvas)
  observer = new ResizeObserver(draw); observer.observe(node)
  photo = new Image()
  photo.onload = () => { if (!disposed) { loaded.value = true; draw() } }
  photo.onerror = () => { if (!disposed) failed.value = true }
  // Only the already selected local photo reaches this editor.
  try {
    if (!props.src.startsWith('blob:') && !/^data:image\/(jpeg|png);base64,/.test(props.src)) throw new Error('local image required')
    if (props.src.startsWith('blob:')) {
      prepared = await prepareUploadImage(props.src, { maxBytes: props.maxBytes, maxPixels: 24000000, maxEdge: 2048 }, { normalizeUnsupportedImage: props.normalizeUnsupportedImage, signal: controller.signal })
      if (disposed) { prepared.dispose(); return }
      photo.src = prepared.path
      return
    }
    const response = await fetch(props.src, { signal: controller.signal })
    if (!response.ok) throw new Error('local image unavailable')
    const source = await response.blob()
    if (source.size < 16 || source.size > props.maxBytes) throw new Error('image size')
    const header = uploadImageHeader(new Uint8Array(await source.arrayBuffer()))
    uploadImageSize(header.width, header.height, { maxBytes: props.maxBytes, maxPixels: 24000000, maxEdge: 2048 })
    if (!disposed) photo.src = props.src
  } catch { if (!disposed) failed.value = true }
})
onBeforeUnmount(() => { disposed = true; controller.abort(); prepared?.dispose(); observer?.disconnect(); pointers.clear(); if (photo) { photo.onload = photo.onerror = null; photo.removeAttribute('src') } canvas?.remove() })
</script>

<template>
  <view class="mobile-avatar-cropper">
    <view class="mobile-avatar-cropper__heading"><text class="mobile-avatar-cropper__title">调整头像</text><text>拖动照片，或点按要居中的位置</text><text v-if="notice" role="status">{{ notice }}</text></view>
    <view class="mobile-avatar-cropper__workspace"><view ref="stage" class="mobile-avatar-cropper__stage" /><text v-if="failed" role="alert">这张图片暂时无法处理，请重新选择</text><text v-else-if="!loaded" role="status">正在读取照片…</text></view>
    <view class="mobile-avatar-cropper__tools">
      <view class="mobile-avatar-cropper__zoom"><MobileAction variant="icon" aria-label="缩小照片" :disabled="!loaded || zoom <= 1" @click="magnify(-.25)"><text aria-hidden="true">−</text></MobileAction><text role="status">{{ Math.round(zoom * 100) }}%</text><MobileAction variant="icon" aria-label="放大照片" :disabled="!loaded || zoom >= 4" @click="magnify(.25)"><MobileIcon name="add" :size="20" /></MobileAction><MobileAction variant="icon" aria-label="旋转头像" :disabled="!loaded" @click="rotate"><MobileIcon name="refresh" :size="22" /></MobileAction></view>
      <view class="mobile-avatar-cropper__actions"><MobileAction class="mobile-avatar-cropper__cancel secondary" @click="emit('cancel')">取消</MobileAction><MobileAction class="primary" :disabled="!loaded || failed" @click="confirm">使用头像</MobileAction></view>
    </view>
  </view>
</template>

<style scoped>
.mobile-avatar-cropper { position:fixed;inset:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:12px;padding:calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box;background:#080a0c;color:#fff; }
.mobile-avatar-cropper__heading { display:grid;gap:6px;text-align:center;font-size:.875rem;line-height:1.4; }
.mobile-avatar-cropper__title { font-size:1.125rem;font-weight:650; }
.mobile-avatar-cropper__workspace { min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px; }
.mobile-avatar-cropper__stage { flex:none;width:min(100%,calc(100dvh - 240px),480px);aspect-ratio:1;position:relative;outline:1px solid #ffffff99; }
.mobile-avatar-cropper__stage::after { content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(to right,transparent calc(33.333% - .5px),#ffffff55 33.333%,transparent calc(33.333% + .5px),transparent calc(66.666% - .5px),#ffffff55 66.666%,transparent calc(66.666% + .5px)),linear-gradient(to bottom,transparent calc(33.333% - .5px),#ffffff55 33.333%,transparent calc(33.333% + .5px),transparent calc(66.666% - .5px),#ffffff55 66.666%,transparent calc(66.666% + .5px)); }
.mobile-avatar-cropper__tools { display:grid;gap:12px; }
.mobile-avatar-cropper__zoom { display:flex;align-items:center;justify-content:center;gap:12px;font-variant-numeric:tabular-nums; }
.mobile-avatar-cropper__zoom .mobile-action { color:#fff;background:#ffffff20;border-radius:50%;width:48px;height:48px;min-width:48px; }
.mobile-avatar-cropper__actions { display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:480px;width:100%;margin:auto; }
.mobile-avatar-cropper__actions .mobile-action { min-height:48px;padding:10px 12px;border-radius:12px; }
.mobile-avatar-cropper__cancel.mobile-action { color:#fff;background:#ffffff20; }
@media (max-height:450px) { .mobile-avatar-cropper { grid-template-columns:minmax(0,1fr) minmax(220px,40%);grid-template-rows:1fr;gap:20px;padding:16px; }.mobile-avatar-cropper__heading { display:none; }.mobile-avatar-cropper__stage { width:min(100%,calc(100dvh - 32px),320px); }.mobile-avatar-cropper__tools { align-content:center; } }
</style>
