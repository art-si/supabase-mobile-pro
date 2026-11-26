<script setup lang="ts">
import { ref } from 'vue'
import MobileAction from '@mobile-core/components/MobileAction.vue'
import MobileLoadingStatus from '@mobile-core/components/MobileLoadingStatus.vue'
import MobileWorkspace from '@mobile-core/components/MobileWorkspace.vue'

const refreshed = ref(false)
function showExample() {
  refreshed.value = !refreshed.value
}
</script>

<template>
  <MobileWorkspace container-class="mobile-page">
    <view class="starter-content">
      <text role="heading" aria-level="1" class="starter-heading">移动端起步模板</text>
      <text>此页面只演示公共布局和控件，不连接任何业务服务。</text>
      <MobileAction :aria-pressed="refreshed" @click="showExample">
        {{ refreshed ? '隐藏加载示例' : '显示加载示例' }}
      </MobileAction>
      <MobileLoadingStatus v-if="refreshed" label="正在加载示例" block />
    </view>
  </MobileWorkspace>
</template>

<style scoped>
.starter-content {
  box-sizing: border-box;
  width: min(100%, 560px);
  margin-inline: auto;
  display: grid;
  gap: 1rem;
  padding: max(24px, var(--mobile-safe-top)) var(--mobile-workspace-inset) max(24px, var(--mobile-safe-bottom));
}
.starter-heading { font-size: 1.5rem; font-weight: 700; }
</style>
