<script setup lang="ts">
import { computed } from 'vue'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'

const props = withDefaults(defineProps<{
  modelValue: string
  name: string
  label: string
  placeholder: string
  maxlength?: number
}>(), { maxlength: 64 })
const emit = defineEmits<{ 'update:modelValue': [value: string]; submit: []; clear: [] }>()
const text = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

function clear() {
  text.value = ''
  emit('clear')
}
</script>

<template>
  <view class="mobile-search" role="search">
    <MobileIcon class="mobile-search__icon" name="search" size="31rpx" aria-hidden="true" />
    <input
      v-model="text"
      class="mobile-search__field"
      :name="name"
      :aria-label="label"
      :placeholder="placeholder"
      :maxlength="maxlength"
      autocomplete="off"
      confirm-type="search"
      @confirm="emit('submit')"
    />
    <MobileAction v-if="text" class="mobile-search__clear" aria-label="清除搜索" @click="clear">
      <MobileIcon name="close" size="30rpx" aria-hidden="true" />
    </MobileAction>
    <MobileAction class="mobile-search__submit" @click="emit('submit')">搜索</MobileAction>
  </view>
</template>

<style scoped lang="scss">
.mobile-search {
  --mobile-search-ink: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong)));
  --mobile-search-muted: var(--mobile-workspace-muted, var(--tms-text-secondary, var(--smis-text-secondary)));
  --mobile-search-accent: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  --mobile-search-height: var(--mobile-workspace-action-height, max(44px, 84rpx));
  display: flex;
  align-items: center;
  min-width: 0;
  background: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface)));
  border: 1px solid var(--mobile-workspace-line, var(--tms-line-subtle, var(--smis-line-subtle)));
  border-radius: 14px;
}

.mobile-search:focus-within {
  outline: 2px solid var(--mobile-workspace-focus, var(--mobile-search-accent));
  outline-offset: 2px;
}

.mobile-search__icon { flex: none; margin-inline-start: 12px; color: var(--mobile-search-muted); }

.mobile-search__field {
  flex: 1;
  min-width: 0;
  min-height: var(--mobile-search-height);
  padding-inline: 8px;
  color: var(--mobile-search-ink);
  font-size: 16px;
}

.mobile-search .mobile-search__submit,
.mobile-search .mobile-search__clear {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: var(--mobile-search-height);
  padding-inline: 8px;
  color: var(--mobile-search-accent);
  font-size: max(24rpx, 13px);
  font-weight: 650;
  white-space: nowrap;
}

.mobile-search .mobile-search__clear { color: var(--mobile-search-muted); }
.mobile-search .mobile-search__submit { padding-inline-end: 11px; }
</style>
