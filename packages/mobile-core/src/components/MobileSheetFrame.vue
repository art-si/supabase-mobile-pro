<script setup lang="ts">
// #ifdef H5
import { nextTick, ref, watch } from 'vue'
import WdRootPortal from '@wot-ui/ui/components/wd-root-portal/wd-root-portal.vue'
import { useLockScroll } from '@wot-ui/ui/composables/useLockScroll'
import { elementOf, type ElementTarget } from '../form-focus'
// #endif

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })
const props = defineProps<{
  open: boolean
  rootPortal?: boolean
  zIndex: number
  panelStyle: string
  lockScroll: boolean
  dismissible: boolean
}>()
const emit = defineEmits<{ dismiss: []; 'after-enter': []; 'after-leave': [] }>()
const enterDuration = 300
const leaveDuration = 200

function dismiss() {
  if (props.open && props.dismissible) emit('dismiss')
}

// #ifdef H5
const mounted = ref(false)
const presented = ref(false)
const raised = ref(false)
const surface = ref<ElementTarget>()
useLockScroll(() => props.open && props.lockScroll)

watch(() => props.open, async (open, _, onCleanup) => {
  if (typeof window === 'undefined' || (!open && !presented.value)) return
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => {
    cancelled = true
    clearTimeout(timer)
  })

  if (open && !presented.value) {
    mounted.value = true
    presented.value = true
    await nextTick()
    if (cancelled) return
    // Establish the offscreen starting position only for a newly shown sheet.
    elementOf(surface.value)?.getBoundingClientRect()
  }
  raised.value = open

  const finish = () => {
    if (cancelled || open !== props.open) return
    if (open) emit('after-enter')
    else {
      presented.value = false
      emit('after-leave')
    }
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await nextTick()
    finish()
  } else {
    timer = setTimeout(finish, open ? enterDuration : leaveDuration)
  }
}, { immediate: true })
// #endif
</script>

<template>
  <!-- #ifdef H5 -->
  <component :is="rootPortal ? WdRootPortal : 'div'" v-if="mounted">
    <view v-show="presented" class="mobile-sheet-frame" :class="{ 'mobile-sheet-frame--raised': raised }"
      :style="{ zIndex, '--mobile-sheet-motion-duration': (raised ? enterDuration : leaveDuration) + 'ms' }"
      :inert="!open || undefined">
      <view class="mobile-sheet-frame__scrim" aria-hidden="true" @click="dismiss" />
      <view ref="surface" class="wd-popup wd-popup--bottom mobile-sheet-frame__surface" :style="panelStyle">
        <slot />
      </view>
    </view>
  </component>
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <wd-popup :model-value="open" position="bottom" :root-portal="rootPortal" :z-index="zIndex"
    :duration="open ? enterDuration : leaveDuration" :lock-scroll="lockScroll"
    :close-on-click-modal="dismissible" :custom-style="panelStyle"
    @update:model-value="dismiss" @after-enter="emit('after-enter')" @after-leave="emit('after-leave')">
    <slot />
  </wd-popup>
  <!-- #endif -->
</template>

<style scoped>
/* #ifdef H5 */
.mobile-sheet-frame {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.mobile-sheet-frame__scrim {
  position: absolute;
  inset: 0;
  background: var(--wot-overlay-bg, rgb(0 0 0 / 55%));
  opacity: 0;
  transition: opacity var(--mobile-sheet-motion-duration) ease;
}
.mobile-sheet-frame__surface {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  max-height: 100%;
  transform: translateY(100%);
  transition: transform var(--mobile-sheet-motion-duration) cubic-bezier(.4, 0, 1, 1);
}
.mobile-sheet-frame--raised .mobile-sheet-frame__scrim {
  opacity: 1;
  pointer-events: auto;
}
.mobile-sheet-frame--raised .mobile-sheet-frame__surface {
  transform: translateY(0);
  transition-timing-function: cubic-bezier(.32, .72, 0, 1);
  pointer-events: auto;
}
@media (prefers-reduced-motion: reduce) {
  .mobile-sheet-frame__scrim,
  .mobile-sheet-frame__surface {
    transition: none;
  }
}
/* #endif */
</style>
