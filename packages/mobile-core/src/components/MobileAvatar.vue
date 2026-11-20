<script setup lang="ts">
import { ref, watch } from 'vue'
defineOptions({options:{styleIsolation:'apply-shared'}})
const props=withDefaults(defineProps<{src?:string;name?:string;size?:number;decorative?:boolean}>(),{size:44,decorative:true,name:''})
const failed=ref(false)
watch(()=>props.src,()=>{failed.value=false})
</script>
<template>
  <view class="mobile-avatar" :style="{width:size+'px',height:size+'px'}" :role="decorative?undefined:'img'" :aria-hidden="decorative||undefined" :aria-label="decorative?undefined:(name?name+'的头像':'头像')">
    <image v-if="src&&!failed" :src="src" class="mobile-avatar__image" mode="aspectFill" aria-hidden="true" @error="failed=true" />
    <slot v-else><text>{{name.trim().slice(0,1)}}</text></slot>
  </view>
</template>
<style scoped>
.mobile-avatar{display:flex;align-items:center;justify-content:center;flex:none;overflow:hidden;border-radius:50%;background:var(--mobile-workspace-accent-soft,var(--tms-surface-soft,var(--smis-surface-soft)));color:var(--mobile-workspace-accent,var(--tms-primary,var(--smis-primary)));font-weight:650;font-size:1.125rem}
.mobile-avatar__image{display:block;width:100%;height:100%}
</style>
