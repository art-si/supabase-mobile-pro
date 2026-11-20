<script setup lang="ts">
import { computed } from 'vue'
import MobileMultiChoice from './MobileMultiChoice.vue'
defineOptions({ options: { styleIsolation: 'apply-shared' } })
const props = defineProps<{
  field: string
  label: string
  inputLabel?: string
  placeholder?: string
  options: readonly { id: string; name: string }[]
  maxlength?: number
  disabled?: boolean
  error?: string
  focus?: boolean
}>()
const model = defineModel<string>({ default: '' })
const selection = computed({
  get: () => props.options.find((option) => option.id === model.value)?.name || model.value,
  set: (name: string) => { model.value = props.options.find((option) => option.name === name)?.id || name }
})
</script>
<template>
  <MobileMultiChoice v-model="selection" :field="field" :label="label" :input-label="inputLabel"
    :placeholder="placeholder" :options="options" :maxlength="maxlength" :disabled="disabled"
    :error="error" :focus="focus" single :max-selected="1" />
</template>
