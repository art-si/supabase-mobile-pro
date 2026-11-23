<script setup lang="ts">
import {
  computed,
  nextTick,
  onScopeDispose,
  ref,
  watch,
  watchPostEffect,
} from "vue";
import { activateActionKey, preventActionKey, activateButtonKey } from "../action-keyboard"
import { nativeFieldOf, useNativeFieldAttributes } from "../form-focus";
import MobileIcon from "./MobileIcon.vue";
import type { MobileIconName } from "../icons";

defineOptions({ options: { styleIsolation: "shared" } });

const props = withDefaults(
  defineProps<{
    modelValue: string;
    name: string;
    label: string;
    placeholder: string;
    maxlength?: number;
    actionLabel?: string;
    disabled?: boolean;
    compactAction?: boolean;
    fitKeyboard?: boolean;
    live?: boolean;
    debounce?: number;
    suggestions?: { id: string; label: string; description?: string; prefix?: string }[];
    suggestionStatus?: string;
    autoSelectFirst?: boolean;
    suggestionIcon?: MobileIconName;
    floatingSuggestions?: boolean;
  }>(),
  { maxlength: 64 },
);
const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
  clear: [];
  keyboard: [height: number];
  search: [value: string];
  select: [id: string];
  dismiss: [];
  preview: [id: string];
}>();
const open = ref(true);
// Live search has no redundant submit affordance. Hosts can still request an explicit action.
const visibleAction = computed(
  () => props.actionLabel ?? (props.live ? "" : "搜索"),
);
const active = ref(-1);
const expanded = computed(() => open.value && !!props.suggestions?.length);
const listId = computed(() => `${props.name}-suggestions`);
const field = useNativeFieldAttributes(() => ({
  "aria-label": props.label,
  "aria-disabled": props.disabled ? "true" : undefined,
  name: props.name,
  role: props.suggestions ? "combobox" : undefined,
  "aria-autocomplete": props.suggestions ? "list" : undefined,
  "aria-expanded": props.suggestions ? String(expanded.value) : undefined,
  "aria-controls": expanded.value ? listId.value : undefined,
  "aria-activedescendant":
    expanded.value && active.value >= 0
      ? `${listId.value}-${active.value}`
      : undefined,
}));
const text = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});
const inputVersion = ref(0);
let composing = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastSearch: string | undefined;
function cancelSearch() {
  clearTimeout(timer);
  timer = undefined;
}
function searchNow(value: string, force = false) {
  cancelSearch();
  if (!props.live || props.disabled || composing) return;
  const keyword = value.trim();
  if (!force && lastSearch === keyword) return;
  lastSearch = keyword;
  emit("search", keyword);
}
function schedule(value: string) {
  cancelSearch();
  // A value can return to the same normalized keyword after an intervening edit.
  // Hosts may already have invalidated the previous request; search it again.
  lastSearch = undefined;
  active.value = -1;
  open.value = true;
  if (!props.live || props.disabled || composing) return;
  if (!value.trim()) searchNow(value);
  else timer = setTimeout(() => searchNow(value), props.debounce ?? 350);
}
watch(() => props.modelValue, schedule);
watch(
  () => props.disabled,
  (value) => {
    if (value) cancelSearch();
  },
);
watch(
  () => props.suggestions,
  (value) => {
    active.value = props.autoSelectFirst && value?.length ? 0 : -1;
    if (value?.length) open.value = true;
  },
);
watch(active, (index) => {
  const item = props.suggestions?.[index];
  if (item && open.value) emit("preview", item.id);
});
onScopeDispose(cancelSearch);
function select(id: string) {
  if (props.disabled) return;
  cancelSearch();
  open.value = false;
  active.value = -1;
  emit("select", id);
}

async function clear() {
  if (props.disabled) return;
  text.value = "";
  // #ifdef H5
  // Uni can replay its debounced previous value on focus. Start with a fresh input state.
  inputVersion.value++;
  // #endif
  emit("clear");
  // #ifdef H5
  await nextTick();
  nativeFieldOf(field.value)?.focus({ preventScroll: true });
  // #endif
}

function submit(value = text.value) {
  if (props.disabled || composing) return;
  if (value !== text.value) text.value = value;
  searchNow(value, true);
  emit("submit");
}

function submitAction() {
  // #ifdef H5
  submit(nativeFieldOf(field.value)?.value);
  // #endif
  // #ifndef H5
  submit();
  // #endif
}

function confirm(event: { detail: { value: string } }) {
  // #ifndef H5
  submit(event.detail.value);
  // #endif
}

// #ifdef H5
watchPostEffect((cleanup) => {
  const input = nativeFieldOf(field.value);
  if (!input) return;
  let started = false;
  const isComposing = (event: KeyboardEvent) =>
    composing || event.isComposing || event.keyCode === 229;
  const onDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent) || isComposing(event)) return;
    if (event.key === "Escape") {
      cancelSearch();
      open.value = false;
      active.value = -1;
      emit("dismiss");
      return;
    }
    if (
      props.suggestions?.length &&
      ["ArrowDown", "ArrowUp"].includes(event.key)
    ) {
      event.preventDefault();
      open.value = true;
      active.value =
        active.value < 0
          ? event.key === "ArrowDown"
            ? 0
            : props.suggestions.length - 1
          : (active.value +
              (event.key === "ArrowDown" ? 1 : -1) +
              props.suggestions.length) %
            props.suggestions.length;
      return;
    }
    if (event.key !== "Enter") return;
    if (!event.repeat) started = !isComposing(event);
    // Leave the key's default action to the IME while choosing or finalizing a candidate.
    if (!isComposing(event)) event.preventDefault();
  };
  const onUp = (event: Event) => {
    if (!(event instanceof KeyboardEvent) || event.key !== "Enter") return;
    event.stopImmediatePropagation();
    const shouldSubmit = started && !isComposing(event);
    started = false;
    if (!shouldSubmit) return;
    event.preventDefault();
    const suggestion = expanded.value
      ? props.suggestions?.[active.value]
      : undefined;
    if (suggestion) select(suggestion.id);
    else submit(input.value);
  };
  const onBlur = () => {
    started = false;
  };
  const onCompositionStart = () => {
    composing = true;
    started = false;
    cancelSearch();
  };
  const onCompositionEnd = () => {
    composing = false;
    text.value = input.value;
    schedule(input.value);
  };
  const onFocus = () => {
    open.value = true;
  };
  input.addEventListener("keydown", onDown, true);
  input.addEventListener("keyup", onUp, true);
  input.addEventListener("blur", onBlur);
  input.addEventListener("compositionstart", onCompositionStart);
  input.addEventListener("compositionend", onCompositionEnd);
  input.addEventListener("focus", onFocus);
  cleanup(() => {
    input.removeEventListener("keydown", onDown, true);
    input.removeEventListener("keyup", onUp, true);
    input.removeEventListener("blur", onBlur);
    input.removeEventListener("compositionstart", onCompositionStart);
    input.removeEventListener("compositionend", onCompositionEnd);
    input.removeEventListener("focus", onFocus);
  });
});
// #endif

function reportKeyboard(event?: FocusEvent | { detail: { height?: number } }) {
  const detail = event?.detail;
  if (props.fitKeyboard)
    emit("keyboard", typeof detail === "object" ? (detail.height ?? 0) : 0);
}
</script>

<template>
  <view
    class="mobile-search-group"
    :class="{ 'mobile-search-group--floating': floatingSuggestions }"
  >
    <view
      class="mobile-search"
      :class="{ 'mobile-search--with-action': visibleAction }"
      role="search"
    >
      <view class="mobile-search__entry">
        <MobileIcon
          class="mobile-search__icon"
          name="search"
          size="31rpx"
          aria-hidden="true"
        />
        <input
          :key="inputVersion"
          ref="field"
          v-model="text"
          class="mobile-search__field"
          :class="{ 'mobile-search__field--disabled': disabled }"
          :name="name"
          :aria-label="label"
          :placeholder="placeholder"
          placeholder-class="mobile-search__placeholder"
          :maxlength="maxlength"
          :disabled="disabled"
          autocomplete="off"
          confirm-type="search"
          :adjust-position="!fitKeyboard"
          @confirm="confirm"
          @focus="reportKeyboard"
          @blur="reportKeyboard()"
          @keyboardheightchange="reportKeyboard"
        />
        <button
          v-if="text"
          class="mobile-action mobile-action--icon mobile-search__clear"
          aria-label="清除搜索"
          :disabled="disabled"
          @click="clear"
         role="button" :tabindex="(disabled) ? -1 : 0" :aria-disabled="(disabled) || undefined" hover-class="mobile-action--pressed" @keydown="preventActionKey" @keyup="activateButtonKey">
          <MobileIcon name="close" size="30rpx" aria-hidden="true" />
        </button>
      </view>
      <button
        v-if="visibleAction"
        class="mobile-action mobile-search__submit"
        :class="{ 'mobile-search__submit--compact': compactAction }"
        :disabled="disabled"
        :aria-disabled="disabled || undefined"
        :tabindex="disabled ? -1 : 0"
        role="button"
        hover-class="mobile-action--pressed"
        @click="submitAction"
        @keydown="preventActionKey"
        @keyup="activateActionKey($event, submitAction)"
      >
        <text class="mobile-search__action-label">{{ visibleAction }}</text>
      </button>
    </view>
    <view
      v-if="expanded"
      :id="listId"
      class="mobile-search__suggestions"
      role="listbox"
      :aria-label="`${label}建议`"
    >
      <button
        v-for="(item, index) in suggestions"
        :id="`${listId}-${index}`"
        :key="item.id"
        class="mobile-action mobile-search__suggestion"
        :class="{ 'mobile-search__suggestion--active': active === index }"
        role="option"
        :aria-selected="active === index"
        :tabindex="disabled ? -1 : 0"
        :disabled="disabled"
        hover-class="mobile-action--pressed"
        @click="select(item.id)"
        @keydown="preventActionKey"
        @keyup="activateActionKey($event, () => select(item.id))"
      >
        <text v-if="item.prefix" class="mobile-search__suggestion-prefix">{{ item.prefix }}</text>
        <MobileIcon
          v-if="suggestionIcon"
          class="mobile-search__suggestion-icon"
          :name="suggestionIcon"
          size="20px"
          aria-hidden="true"
        />
        <view class="mobile-search__suggestion-body">
          <text class="mobile-search__suggestion-label">{{ item.label }}</text>
          <text
            v-if="item.description"
            class="mobile-search__suggestion-description"
            >{{ item.description }}</text
          >
        </view>
      </button>
    </view>
    <text
      v-if="open && suggestionStatus && (!floatingSuggestions || !expanded)"
      class="mobile-search__status"
      role="status"
      aria-live="polite"
      >{{ suggestionStatus }}</text
    >
  </view>
</template>

<style scoped lang="scss">
.mobile-search-group {
  min-width: 0;
  position: relative;
}
.mobile-search-group--floating .mobile-search__suggestions {
  position: absolute;
  top: 100%;
  inset-inline: 0;
  z-index: 5;
  max-height: var(--mobile-search-suggestions-height, min(38dvh, 320px));
  overflow-y: auto;
  overscroll-behavior: contain;
  box-shadow: 0 4px 18px #0002;
}
.mobile-search-group--floating .mobile-search__status {
  position: absolute;
  top: 100%;
  inset-inline: 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(
    --mobile-workspace-surface,
    var(--tms-surface, var(--smis-surface))
  );
}

.mobile-search__suggestions {
  margin-top: 8px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid
    var(
      --mobile-workspace-line,
      var(--tms-line-subtle, var(--smis-line-subtle))
    );
  background: var(
    --mobile-workspace-surface,
    var(--tms-surface, var(--smis-surface))
  );
}
.mobile-search__suggestion {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  text-align: start;
  border-radius: 0;
  color: var(
    --mobile-workspace-ink,
    var(--tms-text-strong, var(--smis-text-strong))
  );
}
.mobile-search__suggestion + .mobile-search__suggestion {
  border-top: 1px solid
    var(
      --mobile-workspace-line,
      var(--tms-line-subtle, var(--smis-line-subtle))
    );
}
.mobile-search__suggestion--active {
  background: var(
    --mobile-search-selection,
    var(--tms-primary-soft, var(--smis-primary-soft))
  );
  box-shadow: inset 3px 0
    var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
}
.mobile-search__suggestion-icon {
  flex: none;
  color: var(
    --mobile-workspace-muted,
    var(--tms-text-secondary, var(--smis-text-secondary))
  );
}
.mobile-search__suggestion--active .mobile-search__suggestion-icon {
  color: var(
    --mobile-workspace-accent,
    var(--tms-primary, var(--smis-primary))
  );
}
.mobile-search__suggestion-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.mobile-search__suggestion-label {
  font-size: 1rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.mobile-search__suggestion-description,
.mobile-search__status {
  font-size: 0.8125rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  color: var(
    --mobile-workspace-muted,
    var(--tms-text-secondary, var(--smis-text-secondary))
  );
}
.mobile-search__status {
  display: block;
  margin-top: 8px;
}
.mobile-search {
  --mobile-search-ink: var(
    --mobile-workspace-ink,
    var(--tms-text-strong, var(--smis-text-strong))
  );
  --mobile-search-muted: var(
    --mobile-workspace-muted,
    var(--tms-text-secondary, var(--smis-text-secondary))
  );
  --mobile-search-accent: var(
    --mobile-workspace-accent,
    var(--tms-primary, var(--smis-primary))
  );
  --mobile-search-height: var(
    --mobile-workspace-action-height,
    max(44px, 84rpx)
  );
  display: grid;
  align-items: center;
  min-width: 0;
  background: var(
    --mobile-workspace-surface,
    var(--tms-surface, var(--smis-surface))
  );
  border: 1px solid
    var(
      --mobile-workspace-line,
      var(--tms-line-subtle, var(--smis-line-subtle))
    );
  border-radius: 14px;
}

.mobile-search--with-action {
  // Size the input from the containing panel and font size; move the action to its own row when needed.
  display: flex;
  flex-wrap: wrap;
}
.mobile-search__entry {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 min(100%, 9rem);
}

.mobile-search:focus-within {
  outline: 2px solid var(--mobile-workspace-focus, var(--mobile-search-accent));
  outline-offset: 2px;
}

.mobile-search__icon {
  flex: none;
  margin-inline-start: 12px;
  color: var(--mobile-search-muted);
}

.mobile-search__field {
  flex: 1;
  min-width: 0;
  min-height: var(--mobile-search-height);
  padding-inline: 8px;
  color: var(--mobile-search-ink);
  font-size: max(16px, 1rem);
}
.mobile-search__field--disabled {
  opacity: 0.65;
}

.mobile-search__placeholder {
  color: var(--mobile-search-muted);
}

.mobile-search .mobile-search__submit {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: var(--mobile-search-height);
  padding-inline: 8px;
  margin-inline-start: auto;
  color: var(--mobile-search-accent);
  font-size: max(24rpx, 13px, 0.8125rem);
  font-weight: 650;
  white-space: nowrap;
}

.mobile-search .mobile-search__clear {
  min-height: var(--mobile-search-height);
  color: var(--mobile-search-muted);
}
.mobile-search .mobile-search__submit {
  padding-inline-end: 11px;
}

.mobile-search .mobile-search__submit--compact {
  padding-inline: 4px;
}
.mobile-search__submit--compact .mobile-search__action-label {
  display: grid;
  place-items: center;
  min-width: 54px;
  height: 32px;
  padding-inline: 8px;
  border-radius: 8px;
  color: #fff;
  background: var(--mobile-search-accent);
}
.mobile-search__suggestion-prefix { flex: 0 0 3.5rem; align-self: center; color: var(--mobile-workspace-muted, var(--tms-muted, var(--smis-muted))); font-size: .8125rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>
