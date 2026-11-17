<script setup lang="ts">
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

withDefaults(defineProps<{
  icon: string
  label: string
  iconSize?: string | number
  iconColor?: string
  iconPosition?: 'start' | 'end'
}>(), { iconSize: '1em' })
</script>

<template>
  <view class="mobile-inline-pair" :class="{ 'mobile-inline-pair--icon-end': iconPosition === 'end' }">
    <MobileIcon :name="icon" :size="iconSize" :color="iconColor" align-to-label />
    <text class="mobile-inline-pair__label">{{ label }}</text>
  </view>
</template>
