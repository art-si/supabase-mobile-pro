<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from "vue";
import { activateActionKey, preventActionKey } from "../action-keyboard";
import MobileBottomSheet from "./MobileBottomSheet.vue";
import MobileIcon from "./MobileIcon.vue";
import MobilePickerTrigger from "./MobilePickerTrigger.vue";
import MobileSearch from "./MobileSearch.vue";

defineOptions({ options: { styleIsolation: "shared" } });

const props = defineProps<{
  options: readonly { id: string; name: string }[];
  label: string;
  placeholder: string;
  field?: string;
  compact?: boolean;
  iconOnly?: boolean
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}>();
const model = defineModel<string>({ default: "" });
const emit = defineEmits<{ select: [id: string] }>();
const instance = getCurrentInstance();
const uid = instance?.uid;
const triggerId = computed(() => props.field || `mobile-select-${uid}`);
const dialogId = computed(() => `${triggerId.value}-options`);
const optionListId = computed(() => `${dialogId.value}-list`);
const visible = ref(false);
const query = ref("");
const filterQuery = ref("");
const keyboardHeight = ref(0);
const measuredHeight = ref<number>();
const searchEnabled = computed(() => props.options.length > 8);
const displayValue = computed(() =>
  props.compact
    ? undefined
    : props.options.find((option) => option.id === model.value)?.name,
);
const choices = computed(() => {
  const search = filterQuery.value.trim().toLowerCase();
  return search
    ? props.options.filter((option) =>
        option.name.toLowerCase().includes(search),
      )
    : props.options;
});
const optionHeight = computed(() =>
  Math.min(364, measuredHeight.value ?? Math.max(choices.value.length, 1) * 52),
);

function measureOptions() {
  if (!visible.value) return;
  const currentChoices = choices.value;
  const applySize = (height?: number) => {
    if (
      visible.value &&
      choices.value === currentChoices &&
      height &&
      height > 0
    ) {
      measuredHeight.value = Math.ceil(height);
    }
  };
  // #ifdef H5
  applySize(
    document.getElementById(optionListId.value)?.getBoundingClientRect().height,
  );
  // #endif
  // #ifndef H5
  if (!instance?.proxy) return;
  uni
    .createSelectorQuery()
    .in(instance.proxy)
    .select(".mobile-select__option-list")
    .boundingClientRect((rect) => {
      if (rect && !Array.isArray(rect)) applySize(rect.height);
    })
    .exec();
  // #endif
}

watch([visible, choices], measureOptions, { flush: "post" });

function open() {
  query.value = "";
  filterQuery.value = "";
  keyboardHeight.value = 0;
  measuredHeight.value = undefined;
  visible.value = true;
}

function choose(value: string) {
  if (!props.compact) model.value = value;
  emit("select", value);
  visible.value = false;
}
</script>

<template>
  <view class="mobile-select" :class="{ 'mobile-select--compact': compact }">
    <MobilePickerTrigger
      :id="triggerId"
      class="mobile-select__control"
      :value="displayValue"
      :placeholder="placeholder"
      :compact="compact" :icon-only="iconOnly"
      :expanded="visible"
      :disabled="disabled"
      :label="label"
      :invalid="invalid"
      :described-by="describedBy"
      :description="displayValue ? `当前选项：${displayValue}` : undefined"
      :aria-controls="visible ? dialogId : undefined"
      @click="open"
    />

    <MobileBottomSheet
      v-model="visible"
      :title="label"
      close-label="关闭选择"
      root-portal
      :z-index="180"
      :trigger-id="triggerId"
      :dialog-id="dialogId"
      :body-height="optionHeight"
      :keyboard-height="keyboardHeight"
      initial-focus=".mobile-select__option--selected"
      @after-enter="measureOptions"
    >
      <template v-if="searchEnabled" #toolbar>
        <MobileSearch
          v-model="query"
          class="mobile-select__search"
          :name="`${triggerId}-query`"
          :label="`搜索${label}的选项`"
          placeholder="搜索选项…"
          action-label=""
          live
          :debounce="0"
          @search="filterQuery = $event"
          fit-keyboard
          @keyboard="keyboardHeight = $event"
        />
      </template>
      <view :id="optionListId" class="mobile-select__option-list">
        <button
          v-for="choice in choices"
          :key="choice.id"
          class="mobile-action mobile-select__option"
          :class="{
            'mobile-select__option--selected': !compact && choice.id === model,
          }"
          role="button"
          tabindex="0"
          :aria-pressed="!compact && choice.id === model"
          hover-class="mobile-action--pressed"
          @click="choose(choice.id)"
          @keydown="preventActionKey"
          @keyup="activateActionKey($event, () => choose(choice.id))"
        >
          <text>{{ choice.name }}</text>
          <MobileIcon
            v-if="!compact && choice.id === model"
            name="check"
            size="20px"
            aria-hidden="true"
          />
        </button>
        <text
          v-if="!choices.length"
          class="mobile-select__empty"
          role="status"
          >{{ query ? "没有匹配的选项" : "暂无可选项" }}</text
        >
      </view>
    </MobileBottomSheet>
  </view>
</template>

<style scoped lang="scss">
.mobile-select {
  min-width: 0;
}
.mobile-select--compact {
  width: fit-content;
  max-width: 100%;
}

.mobile-select__option-list {
  padding: 0 max(16px, var(--mobile-safe-right, 0px)) 8px
    max(16px, var(--mobile-safe-left, 0px));
  color: var(--tms-text-strong, var(--smis-text-strong, #172033));
  font-family: var(--tms-font-family, var(--smis-font-family, sans-serif));
}

.mobile-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  width: 100%;
  padding: 10px 12px;
  border-top: 1px solid var(--tms-line-subtle, var(--smis-line-subtle));
  font-size: 16px;
  line-height: 1.35;
  text-align: start;
  white-space: normal;
  overflow-wrap: anywhere;
}

.mobile-select__option--selected {
  border-radius: 10px;
  color: var(--tms-primary-strong, var(--smis-primary-strong));
  background: var(--tms-primary-soft, var(--smis-primary-soft));
  font-weight: 650;
}

.mobile-select__option:focus-visible {
  outline-offset: -3px;
}
.mobile-select__empty {
  display: block;
  padding: 12px;
  color: var(--tms-muted, var(--smis-muted));
}
</style>
