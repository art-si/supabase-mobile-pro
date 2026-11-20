import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { elementOf, type ElementTarget } from './form-focus'
type Point = { clientX: number; clientY: number }
type TouchLike = { touches?: ArrayLike<Point>; changedTouches?: ArrayLike<Point>; cancelable?: boolean; preventDefault?: () => void }
type Rect = { left: number; right: number; top: number; bottom: number }

/** Reorders references only, preserving each in-flight upload and its progress. */
export function useMediaReorder(options: {
  root: () => ElementTarget
  enabled: () => boolean
  count: () => number
  swap: (from: number, to: number) => void
}) {
  const scope = getCurrentInstance()?.proxy
  const from = ref(-1), target = ref(-1), x = ref(0), y = ref(0), announcement = ref('')
  const dragging = computed(() => from.value >= 0)
  let pending: { index: number; point: Point; touch: boolean } | undefined
  let boxes: Rect[] = [], hold: ReturnType<typeof setTimeout> | undefined
  let suppressUntil = 0, version = 0
  function measure() {
    // #ifdef H5
    boxes = [...(elementOf(options.root())?.querySelectorAll('.mobile-evidence__item') || [])].map((node) => node.getBoundingClientRect())
    return
    // #endif
    // #ifndef H5
    const current = version
    if (scope) uni.createSelectorQuery().in(scope).selectAll('.mobile-evidence__item').boundingClientRect((result) => {
      if (current === version && Array.isArray(result)) boxes = result.filter((r) => [r.left,r.right,r.top,r.bottom].every(Number.isFinite)).map((r) => ({ left:Number(r.left), right:Number(r.right), top:Number(r.top), bottom:Number(r.bottom) }))
    }).exec()
    // #endif
  }
  function reset() {
    version++
    clearTimeout(hold)
    pending = undefined
    from.value = target.value = -1
    x.value = y.value = 0
  }
  function activate() {
    if (!pending || !options.enabled()) return
    from.value = target.value = pending.index
    suppressUntil = Date.now() + 600
  }
  function begin(index: number, point: Point, touch: boolean) {
    if (!options.enabled() || options.count() < 2) return
    reset(); pending = { index, point, touch }; measure()
    if (touch) hold = setTimeout(activate, 320)
  }
  function update(point: Point) {
    if (!pending) return
    if (!options.enabled()) { reset(); return }
    const dx = point.clientX - pending.point.clientX, dy = point.clientY - pending.point.clientY
    if (!dragging.value && Math.hypot(dx,dy) > 6) {
      if (pending.touch) { reset(); return }
      activate()
    }
    if (!dragging.value) return
    x.value = dx; y.value = dy
    target.value = boxes.findIndex((r) => point.clientX >= r.left - 4 && point.clientX <= r.right + 4 && point.clientY >= r.top - 4 && point.clientY <= r.bottom + 4)
  }
  function end() {
    if (dragging.value) {
      suppressUntil = Date.now() + 500
      if (target.value >= 0 && target.value !== from.value && target.value < options.count()) {
        const a = from.value, b = target.value
        options.swap(a,b)
        announcement.value = `已交换第 ${a+1} 项和第 ${b+1} 项`
      }
    }
    reset()
  }
  function pointerMove(event: PointerEvent) { if (pending && !pending.touch) { update(event); if (dragging.value) event.preventDefault() } }
  function startTouch(index: number, event: TouchLike) { if (event.touches?.length === 1 && event.touches[0]) begin(index,event.touches[0],true) }
  function moveTouch(event: TouchLike) { if (event.touches?.length !== 1) { reset(); return }; const point=event.touches[0]; if (point) { update(point); if (dragging.value && event.cancelable) event.preventDefault?.() } }
  function touchStart(index: number, event: TouchLike) {
    // #ifndef H5
    startTouch(index,event)
    // #endif
  }
  function touchMove(event: TouchLike) {
    // #ifndef H5
    moveTouch(event)
    // #endif
  }
  function key(index: number, event: KeyboardEvent) {
    if (event.key === 'Escape' && pending) { event.preventDefault(); suppressUntil=Date.now()+400; reset(); return }
    if (!options.enabled() || !event.altKey || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return
    measure()
    const columns = boxes.filter((r) => Math.abs(r.top - (boxes[0]?.top || 0)) < 5).length || 1
    const offset = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -columns : columns
    const to = index + offset
    event.preventDefault(); event.stopPropagation()
    if (to < 0 || to >= options.count()) return
    options.swap(index,to); announcement.value=`已交换第 ${index+1} 项和第 ${to+1} 项`
    // #ifdef H5
    void nextTick(() => elementOf(options.root())?.querySelector<HTMLElement>(`.mobile-evidence__preview[data-reorder-index="${to}"]`)?.focus())
    // #endif
  }
  function style(index: number) { return from.value === index ? { transform:`translate(${x.value}px, ${y.value}px)`, zIndex:10 } : undefined }
  function allowClick() { return Date.now() >= suppressUntil }
  function context(event: Event) { if (options.enabled()) event.preventDefault() }
  let detach: (() => void) | undefined
  // Uni button normalizes template events and drops PointerEvent fields. Listen
  // to the browser events directly; document listeners keep a drag alive when
  // the pointer leaves its original thumbnail or the grid.
  // #ifdef H5
  onMounted(() => {
    const root=elementOf(options.root())
    if (!root) return
    function preview(event: Event) {
      const node=event.target instanceof Element ? event.target.closest<HTMLElement>('.mobile-evidence__preview[data-reorder-index]') : null
      return node && root?.contains(node) ? node : null
    }
    function pointerDown(event: PointerEvent) {
      if (event.pointerType === 'touch' || event.button !== 0) return
      const node=preview(event)
      if (!node) return
      begin(Number(node.dataset.reorderIndex),event,false)
      if (pending) node.setPointerCapture(event.pointerId)
    }
    function touchDown(event: TouchEvent) {
      const node=preview(event)
      if (node) startTouch(Number(node.dataset.reorderIndex),event)
    }
    function keyDown(event: KeyboardEvent) {
      const node=preview(event)
      if (node) key(Number(node.dataset.reorderIndex),event)
    }
    function preventDrag(event: Event) { if (preview(event) && options.enabled()) event.preventDefault() }
    root.addEventListener('pointerdown',pointerDown)
    root.addEventListener('touchstart',touchDown,{passive:true})
    root.addEventListener('dragstart',preventDrag)
    root.addEventListener('contextmenu',context)
    root.addEventListener('keydown',keyDown,true)
    document.addEventListener('pointermove',pointerMove,{passive:false})
    document.addEventListener('pointerup',end)
    document.addEventListener('pointercancel',reset)
    document.addEventListener('touchmove',moveTouch,{passive:false})
    document.addEventListener('touchend',end)
    document.addEventListener('touchcancel',reset)
    window.addEventListener('blur',reset)
    detach=() => {
      root.removeEventListener('pointerdown',pointerDown)
      root.removeEventListener('touchstart',touchDown)
      root.removeEventListener('dragstart',preventDrag)
      root.removeEventListener('contextmenu',context)
      root.removeEventListener('keydown',keyDown,true)
      document.removeEventListener('pointermove',pointerMove)
      document.removeEventListener('pointerup',end)
      document.removeEventListener('pointercancel',reset)
      document.removeEventListener('touchmove',moveTouch)
      document.removeEventListener('touchend',end)
      document.removeEventListener('touchcancel',reset)
      window.removeEventListener('blur',reset)
    }
  })
  // #endif
  watch(() => [options.enabled(),options.count()] as const,reset)
  onBeforeUnmount(() => { detach?.(); reset() })
  return { from,target,dragging,announcement,touchStart,touchMove,end,cancel:reset,key,style,allowClick,context }
}
