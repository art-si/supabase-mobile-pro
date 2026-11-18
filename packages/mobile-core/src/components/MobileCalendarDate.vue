<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import MobileAction from './MobileAction.vue'
import MobileBottomSheet from './MobileBottomSheet.vue'
import MobileIcon from './MobileIcon.vue'
import { activateActionKey, preventActionKey } from '../action-keyboard'
import { elementOf, type ElementTarget } from '../form-focus'
import { CALENDAR_WEEKDAYS, monthDayNumbers } from '../month-calendar'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

defineProps<{ title: string }>()
const date = defineModel<number>({ required: true })
const visible = defineModel<boolean>('visible', { required: true })

const steps = [{ delta: -12, label: '上一年' }, { delta: -1, label: '上个月' },
  { delta: 1, label: '下个月' }, { delta: 12, label: '下一年' }] as const
const grid = ref<ElementTarget>()
const selected = ref(0)
const cursor = ref(0)
const today = ref(0)
const minDate = ref(0)
const maxDate = ref(0)

function midnight(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function formatDate(value: number) {
  const day = new Date(value)
  return `${day.getFullYear()}年${day.getMonth() + 1}月${day.getDate()}日`
}

watch(visible, (open) => {
  if (!open) return
  const now = new Date()
  today.value = midnight(now)
  minDate.value = new Date(now.getFullYear() - 5, 0, 1).getTime()
  maxDate.value = new Date(now.getFullYear() + 1, 11, 31).getTime()
  const value = midnight(new Date(date.value))
  selected.value = cursor.value = Number.isFinite(value) ? clampDay(value) : today.value
}, { immediate: true, flush: 'sync' })

function clampDay(value: number) {
  return Math.max(minDate.value, Math.min(maxDate.value, value))
}

const cursorDate = computed(() => new Date(cursor.value))
const year = computed(() => cursorDate.value.getFullYear())
const month = computed(() => cursorDate.value.getMonth())
const period = computed(() => `${year.value}年${month.value + 1}月`)
const days = computed(() => monthDayNumbers(year.value, month.value).map((number, index) => {
  if (!number) return { key: `blank-${index}` }
  const value = new Date(year.value, month.value, number).getTime()
  return { key: value, value, label: formatDate(value), number }
}))

function canChangeMonth(delta: number) {
  const monthStart = new Date(year.value, month.value + delta, 1).getTime()
  return monthStart >= minDate.value && monthStart <= maxDate.value
}

function changeMonth(delta: number) {
  if (!canChangeMonth(delta)) return false
  const last = new Date(year.value, month.value + delta + 1, 0).getDate()
  cursor.value = new Date(year.value, month.value + delta, Math.min(cursorDate.value.getDate(), last)).getTime()
  return true
}

function pick(value: number) {
  selected.value = cursor.value = value
}

function confirm() {
  date.value = selected.value
  visible.value = false
}

async function focusCursor() {
  // #ifdef H5
  await nextTick()
  elementOf(grid.value)?.querySelector<HTMLElement>(`[data-date="${cursor.value}"]`)?.focus()
  // #endif
}

function onDayKey(event: KeyboardEvent) {
  if (event.isComposing || preventActionKey(event)) return
  const day = cursorDate.value
  switch (event.key) {
    case 'ArrowLeft': cursor.value = clampDay(new Date(year.value, month.value, day.getDate() - 1).getTime()); break
    case 'ArrowRight': cursor.value = clampDay(new Date(year.value, month.value, day.getDate() + 1).getTime()); break
    case 'ArrowUp': cursor.value = clampDay(new Date(year.value, month.value, day.getDate() - 7).getTime()); break
    case 'ArrowDown': cursor.value = clampDay(new Date(year.value, month.value, day.getDate() + 7).getTime()); break
    case 'Home': cursor.value = clampDay(new Date(year.value, month.value, day.getDate() - day.getDay()).getTime()); break
    case 'End': cursor.value = clampDay(new Date(year.value, month.value, day.getDate() + 6 - day.getDay()).getTime()); break
    case 'PageUp': changeMonth(event.shiftKey ? -12 : -1); break
    case 'PageDown': changeMonth(event.shiftKey ? 12 : 1); break
    default: return
  }
  event.preventDefault()
  event.stopPropagation()
  void focusCursor()
}
</script>

<template>
  <MobileBottomSheet v-model="visible" :title="title" close-label="关闭日期选择" initial-focus=".mobile-calendar__day[tabindex='0']">
    <view class="mobile-calendar">
      <view class="mobile-calendar__navigation">
        <MobileAction v-for="step in steps" :key="step.delta" class="mobile-calendar__step" variant="icon"
          :class="{ 'mobile-calendar__step--next': step.delta > 0 }" :aria-label="step.label"
          :disabled="!canChangeMonth(step.delta)" @click="changeMonth(step.delta)"
        >
          <view class="mobile-calendar__glyph" :class="{ 'mobile-calendar__glyph--previous': step.delta < 0 }">
            <MobileIcon name="chevron" :size="13" />
            <MobileIcon v-if="Math.abs(step.delta) === 12" name="chevron" :size="13" />
          </view>
        </MobileAction>
        <text class="mobile-calendar__period" role="status">{{ period }}</text>
      </view>

      <view class="mobile-calendar__grid" aria-hidden="true">
        <text v-for="weekday in CALENDAR_WEEKDAYS" :key="weekday" class="mobile-calendar__weekday">{{ weekday }}</text>
      </view>
      <view ref="grid" class="mobile-calendar__grid" role="group" :aria-label="period">
        <template v-for="cell in days" :key="cell.key">
          <button v-if="cell.value !== undefined" class="mobile-action mobile-calendar__day" role="button"
            :tabindex="cell.value === cursor ? 0 : -1" :data-date="cell.value" :aria-label="cell.label"
            :aria-pressed="cell.value === selected" :aria-current="cell.value === today ? 'date' : undefined"
            hover-class="mobile-calendar__day--pressed" @click="pick(cell.value)"
            @keydown="onDayKey" @keyup="activateActionKey($event, () => pick(cell.value))"
          >
            <text class="mobile-calendar__number" :class="{ 'mobile-calendar__number--selected': cell.value === selected, 'mobile-calendar__number--today': cell.value === today }">{{ cell.number }}</text>
          </button>
          <view v-else aria-hidden="true" />
        </template>
      </view>
    </view>
    <template #footer>
      <view class="mobile-calendar__footer">
        <text class="mobile-calendar__selection" role="status">已选：{{ formatDate(selected) }}</text>
        <MobileAction class="mobile-calendar__action mobile-calendar__action--cancel" @click="visible = false">取消</MobileAction>
        <MobileAction class="mobile-calendar__action mobile-calendar__action--confirm" @click="confirm">确定</MobileAction>
      </view>
    </template>
  </MobileBottomSheet>
</template>

<style scoped lang="scss">
@use '../styles/calendar';
.mobile-calendar {
  --mobile-calendar-accent: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong)));
  padding: 8px max(6px, var(--mobile-safe-right, 0px)) 12px max(6px, var(--mobile-safe-left, 0px));
}

.mobile-calendar__navigation { display: grid; align-items: center; text-align: center; grid-template-columns: 44px 44px minmax(0, 1fr) 44px 44px; margin-bottom: 4px; }
.mobile-calendar__step--next { grid-row: 1; grid-column: 4; }
.mobile-calendar__step--next + .mobile-calendar__step--next { grid-column: 5; }
.mobile-calendar__glyph { display: flex; justify-content: center; align-items: center; }
.mobile-calendar__glyph--previous { transform: rotate(180deg); }
.mobile-calendar__step.mobile-action { color: var(--mobile-calendar-accent); border-radius: 12px; }
.mobile-calendar__period { grid-column: 3; grid-row: 1; min-width: 0; font-size: 1rem; font-weight: 700; line-height: 1.25; }

.mobile-calendar__grid { @include calendar.month-grid; align-items: center; }
.mobile-calendar__weekday { padding-block: 5px; font-size: max(12px, .8125rem); color: var(--mobile-workspace-muted, #566174); }
.mobile-calendar__day.mobile-action {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  place-items: center;
  border-radius: 12px;
  font-size: max(14px, .9375rem);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.mobile-calendar__day.mobile-action:focus-visible, .mobile-calendar__step.mobile-action:focus-visible { outline-offset: -2px; }
.mobile-calendar__number {
  display: grid;
  min-width: 34px;
  min-height: 34px;
  padding: 2px;
  box-sizing: border-box;
  place-items: center;
  border-radius: 11px;
  border: 1px solid transparent;
}
.mobile-calendar__number--today { border-color: var(--mobile-calendar-accent); font-weight: 700; }
.mobile-calendar__number--selected { color: #fff; background: var(--mobile-calendar-accent); font-weight: 700; }
.mobile-calendar__day--pressed .mobile-calendar__number:not(.mobile-calendar__number--selected) {
  background: var(--tms-primary-soft, var(--smis-primary-soft));
}

.mobile-calendar__footer { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.mobile-calendar__selection { grid-column: 1 / -1; font-size: max(12px, .8125rem); color: var(--mobile-workspace-muted, #566174); }
.mobile-calendar__action.mobile-action {
  display: grid;
  width: 100%;
  min-height: max(44px, var(--mobile-workspace-action-height, 44px));
  place-items: center;
  padding: 6px;
  border-radius: var(--tms-control-radius, var(--smis-control-radius, 12px));
  font-size: .9375rem;
  font-weight: 700;
}
.mobile-calendar__action--cancel.mobile-action {
  color: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  background: var(--tms-primary-soft, var(--smis-primary-soft));
}
.mobile-calendar__action--confirm.mobile-action {
  color: #fff;
  background: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
}
</style>
