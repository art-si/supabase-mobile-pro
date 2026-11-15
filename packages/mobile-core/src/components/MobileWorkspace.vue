<script setup lang="ts">
import { provide } from 'vue'
import { systemInsetsKey, useSystemInsets } from '../system-insets'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })
const systemInsets = useSystemInsets()
provide(systemInsetsKey, systemInsets)
</script>

<template>
  <view :style="systemInsets"><slot /></view>
</template>
