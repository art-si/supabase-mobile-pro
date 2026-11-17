<script setup lang="ts">
import { provide } from 'vue'
import { systemInsetsKey, useSystemInsets } from '../system-insets'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })
// Mini Program class attributes on the component host don't reach this view.
defineProps<{ containerClass: string | string[] }>()
const systemInsets = useSystemInsets()
provide(systemInsetsKey, systemInsets)
</script>

<template>
  <view :class="containerClass" :style="systemInsets"><slot /></view>
</template>
