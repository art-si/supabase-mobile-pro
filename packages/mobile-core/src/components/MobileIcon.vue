<script setup lang="ts">
import { computed } from 'vue'
import { iconGlyphs, type MobileIconName } from '../icons'

const props = withDefaults(defineProps<{
  name: string
  size?: string | number
  color?: string
  containerClass?: string
}>(), { size: 36, color: '' })

const glyph = computed(() => Object.prototype.hasOwnProperty.call(iconGlyphs, props.name)
  ? iconGlyphs[props.name as MobileIconName]
  : iconGlyphs.info)
const iconSize = computed(() => typeof props.size === 'number' ? `${props.size}px` : props.size)
</script>

<template>
  <view
    class="mobile-icon"
    :class="props.containerClass"
    :style="{ width: iconSize, height: iconSize, fontSize: iconSize, color: props.color || 'inherit' }"
    aria-hidden="true"
  >
    <text class="mobile-icon__glyph">{{ glyph }}</text>
  </view>
</template>

<style scoped lang="scss">
.mobile-icon {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.mobile-icon__glyph {
  font-family: 'Mobile Pro Icons' !important;
  font-size: inherit;
  font-style: normal;
  font-weight: 400 !important;
  font-synthesis: none;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
}
</style>
