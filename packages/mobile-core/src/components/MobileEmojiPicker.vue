<script setup lang="ts">
import MobileAction from './MobileAction.vue'
import MobileBottomSheet from './MobileBottomSheet.vue'
import MobileSegmented from './MobileSegmented.vue'
import { computed, ref } from 'vue'
import { EMOJI_CATEGORIES, type MobileEmoji } from '../emoji'

defineOptions({ options: { styleIsolation: 'apply-shared' } })
const visible=defineModel<boolean>({required:true})
const props=withDefaults(defineProps<{options?:readonly MobileEmoji[];title?:string;triggerId?:string}>(),{title:'选择表情'})
const category=ref('mood')
const choices=computed(()=>props.options || EMOJI_CATEGORIES.find(item=>item.value===category.value)!.options)
const emit=defineEmits<{select:[value:string]}>()
function choose(value:string){visible.value=false;emit('select',value)}
</script>
<template>
  <MobileBottomSheet v-model="visible" :title="title" close-label="关闭表情选择" :trigger-id="triggerId" initial-focus=".mobile-emoji-picker__choice">
    <view v-if="!options" class="mobile-emoji-picker__categories"><MobileSegmented v-model="category" label="表情分类" :options="EMOJI_CATEGORIES" /></view>
    <view class="mobile-emoji-picker" :aria-label="options ? '常用表情' : `${EMOJI_CATEGORIES.find(item=>item.value===category)!.label}表情`">
      <MobileAction v-for="emoji in choices" :key="emoji.value" class="mobile-emoji-picker__choice" :aria-label="`插入${emoji.label}表情`" @click="choose(emoji.value)"><text aria-hidden="true">{{ emoji.value }}</text></MobileAction>
    </view>
  </MobileBottomSheet>
</template>
<style scoped>
.mobile-emoji-picker { display: grid; grid-template-columns: repeat(auto-fit,minmax(max(48px,3rem),1fr)); gap: 8px; padding: 16px; }
.mobile-emoji-picker__categories { padding: 12px 16px 0; }
@media (max-width: 22rem) {
  .mobile-emoji-picker__categories :deep(.mobile-segmented) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.mobile-emoji-picker__choice.mobile-action { display: grid; place-items: center; min-width: 48px; min-height: 48px; padding: 8px; font-size: 1.75rem; line-height: 1.2; background: var(--tms-surface-muted,var(--tms-bg)); border-radius: var(--tms-control-radius,12px); }
</style>
