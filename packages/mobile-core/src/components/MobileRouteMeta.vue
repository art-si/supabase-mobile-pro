<script setup lang="ts">
defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })
</script>

<template>
  <view class="mobile-route-meta"><slot /></view>
</template>

<style scoped lang="scss">
.mobile-route-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 10px;
  row-gap: 3px;
  min-width: 0;
  color: var(--mobile-workspace-muted, var(--tms-text-secondary, var(--smis-text-secondary)));
  font-size: max(12px, .75rem);
  font-variant-numeric: tabular-nums;
  line-height: 1.45;
  overflow-wrap: anywhere;
  text-align: start;
}
</style>
