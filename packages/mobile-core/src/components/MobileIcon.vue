<script setup lang="ts">
import { computed } from 'vue'
import { iconGlyphs, type MobileIconName } from '../icons'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

// Bootstrap's asymmetric glyphs need small, size-relative adjustments to center their visible shapes.
const opticalAlignment: Partial<Record<MobileIconName, string>> = {
  check: 'translateX(-.033em)',
  flag: 'translateX(-.029em)',
  risk: 'translateX(-.029em)',
  refresh: 'translateY(.054em)',
  support: 'translateY(.033em)',
  message: 'translateY(.021em)'
}
// A label's visible strokes can sit below its line box's center.
const labelAlignment: Partial<Record<MobileIconName, string>> = {
  'arrow-right': 'translateY(.065em)',
  success: 'translateY(.08em)',
  expense: 'translateY(.04em)',
  nav: 'translateY(.04em)',
  box: 'translateY(.04em)',
  location: 'translateY(.045em)'
}

const props = withDefaults(defineProps<{
  name: string
  size?: string | number
  color?: string
  containerClass?: string
  alignToLabel?: boolean
}>(), { size: 36, color: '' })

const iconName = computed(() => Object.prototype.hasOwnProperty.call(iconGlyphs, props.name)
  ? props.name as MobileIconName
  : 'info')
const iconSize = computed(() => typeof props.size === 'number' ? `${props.size}px` : props.size)
const glyphTransform = computed(() => [opticalAlignment[iconName.value], props.alignToLabel ? labelAlignment[iconName.value] : undefined]
  .filter(Boolean).join(' ') || undefined)
</script>

<template>
  <view
    class="mobile-icon"
    :class="props.containerClass"
    :style="{ width: iconSize, height: iconSize, fontSize: iconSize, color: props.color || undefined }"
    aria-hidden="true"
  >
    <text class="mobile-icon__glyph" :style="{ transform: glyphTransform }">{{ iconGlyphs[iconName] }}</text>
  </view>
</template>

<style scoped lang="scss">
.mobile-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  line-height: 1;
}

.mobile-icon__glyph {
  display: block;
  font-family: 'Mobile Pro Icons' !important;
  font-size: inherit;
  font-style: normal;
  font-weight: 400 !important;
  font-synthesis: none;
  line-height: 1;
  /* #ifdef H5 */
  -webkit-text-size-adjust: none;
  /* #endif */
  -webkit-font-smoothing: antialiased;
}
</style>
