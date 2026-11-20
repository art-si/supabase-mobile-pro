<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from "vue";
import { revealControl } from "../form-focus";
import MobileAction from "./MobileAction.vue";
import MobileField from "./MobileField.vue";
import MobilePickerTrigger from "./MobilePickerTrigger.vue";
import MobileBottomSheet from "./MobileBottomSheet.vue";
import MobileSearch from "./MobileSearch.vue";
defineOptions({ options: { styleIsolation: "apply-shared" } });
const props = withDefaults(
  defineProps<{
    field: string;
    label: string;
    inputLabel?: string;
    options: readonly { id: string; name: string }[];
    maxlength?: number;
    maxSelected?: number;
    single?: boolean;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    focus?: boolean;
  }>(),
  { maxlength: 60, maxSelected: 8 },
);
const model = defineModel<string>({ default: "" });
const nativeScope = getCurrentInstance()?.proxy;
watch(
  () => props.focus,
  (value) => {
    if (value) void revealControl(props.field, { nativeScope });
  },
  { flush: "post", immediate: true },
);
const opened = ref(false),
  query = ref(""),
  filterQuery = ref(""),
  custom = ref(""),
  error = ref(""),
  selected = ref<string[]>([]),
  keyboardHeight = ref(0);
const split = (value: string) => props.single ? (value.trim() ? [value.trim()] : []) : [
  ...new Set(
    value
      .split(/[、,，;；\n]/)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
];
const summary = computed(() => split(model.value).join("、"));
const choices = computed(() =>
  [...new Set([...props.options.map((o) => o.name), ...selected.value])].filter(
    (name) =>
      name.toLowerCase().includes(filterQuery.value.trim().toLowerCase()),
  ),
);
watch(opened, (value) => {
  if (value) {
    selected.value = split(model.value);
    query.value = "";
    filterQuery.value = "";
    custom.value = "";
    error.value = "";
    keyboardHeight.value = 0;
  }
});
function update(next: string[]) {
  error.value = "";
  if (next.length > (props.single ? 1 : props.maxSelected)) {
    error.value = `最多选择 ${props.maxSelected} 项`;
    return false;
  }
  if (
    (!props.single && next.some((x) => x.length > 20)) ||
    next.join("、").length > props.maxlength
  ) {
    error.value = `${props.label}合计最多 ${props.maxlength} 字，单项最多 20 字`;
    return false;
  }
  selected.value = next;
  return true;
}
function toggle(name: string) {
  update(
    selected.value.includes(name)
      ? selected.value.filter((x) => x !== name)
      : props.single ? [name] : [...selected.value, name],
  );
}
function add() {
  const values = split(custom.value);
  if (!values.length) return;
  if (update(props.single ? values.slice(-1) : [...new Set([...selected.value, ...values])])) custom.value = "";
}
function confirm() {
  if (custom.value.trim()) {
    add();
    if (error.value) return;
  }
  model.value = selected.value.join("、");
  opened.value = false;
}
</script>
<template>
  <MobileField :field="field" :label="label" :error="$props.error">
    <MobilePickerTrigger
      :id="field"
      :label="inputLabel || `选择${label}`"
      :value="summary"
      :placeholder="placeholder || (single ? `请选择或自定义${label}` : `可多选，也可自定义${label}`)"
      :disabled="disabled"
      :expanded="opened"
      @click="opened = true"
    />
  </MobileField>
  <MobileBottomSheet
    v-model="opened"
    :title="`选择${label}`"
    :trigger-id="field"
    :close-label="`取消选择${label}`"
    :keyboard-height="keyboardHeight"
    root-portal
    :z-index="180"
    :body-height="320"
  >
    <template #toolbar
      ><MobileSearch
        v-model="query"
        :name="field + '-search'"
        :label="`搜索${label}`"
        :placeholder="`搜索常用${label}`"
        live
        :debounce="0"
        fit-keyboard
        @search="filterQuery = $event"
        @keyboard="keyboardHeight = $event"
    /></template>
    <view
      class="mobile-multi-choice__list"
      role="group"
      :aria-label="`${label}多选列表`"
    >
      <MobileAction
        v-for="name in choices"
        :key="name"
        class="mobile-multi-choice__option"
        role="checkbox"
        :aria-checked="selected.includes(name)"
        @click="toggle(name)"
      >
        <text class="mobile-multi-choice__name">{{ name }}</text
        ><view aria-hidden="true"
          ><wd-checkbox
            :model-value="selected.includes(name)"
            :readonly="true"
            type="circle"
            checked-color="var(--tms-primary,var(--lake))"
            custom-style="--wot-checkbox-icon-size:22px;pointer-events:none"
        /></view>
      </MobileAction>
      <text v-if="!choices.length" class="mobile-multi-choice__hint"
        >没有匹配的预设，可在下方添加。</text
      >
    </view>
    <template #footer
      ><view class="mobile-multi-choice__footer">
        <view class="mobile-multi-choice__custom"
          ><MobileField
            v-model="custom"
            :field="field + '-custom'"
            :label="`添加其他${label}`"
            placeholder="输入名称，可用顿号分隔"
            :maxlength="maxlength"
            @confirm="add"
          /><MobileAction class="secondary" @click="add"
            >添加</MobileAction
          ></view
        >
        <text v-if="error" class="mobile-multi-choice__error" role="alert">{{
          error
        }}</text>
        <MobileAction class="primary" @click="confirm"
          >确定{{
            !single && selected.length ? `（已选 ${selected.length} 项）` : ""
          }}</MobileAction
        >
      </view></template
    >
  </MobileBottomSheet>
</template>
<style scoped>
.mobile-multi-choice__list {
  display: grid;
  min-width: 0;
}
.mobile-multi-choice__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 52px;
  width: 100%;
  padding: 10px 16px;
  border-bottom: 1px solid var(--tms-line-subtle, var(--line));
  font-size: max(16px, 1rem);
  text-align: start;
}
.mobile-multi-choice__name {
  min-width: 0;
  overflow-wrap: anywhere;
}
.mobile-multi-choice__footer {
  display: grid;
  gap: 12px;
  padding: 12px 16px;
  min-width: 0;
}
.mobile-multi-choice__custom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}
.mobile-multi-choice__custom .secondary {
  min-height: 48px;
}
.mobile-multi-choice__hint {
  padding: 16px;
  color: var(--tms-muted, var(--reed));
}
.mobile-multi-choice__error {
  color: var(--tms-red-strong, var(--danger));
  font-size: 14px;
  overflow-wrap: anywhere;
}
</style>
