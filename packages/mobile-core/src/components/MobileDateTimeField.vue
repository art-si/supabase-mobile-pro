<script setup lang="ts">
import { computed, ref } from "vue";
import MobileField from "./MobileField.vue";
import MobilePickerTrigger from "./MobilePickerTrigger.vue";
import MobileCalendarDate from "./MobileCalendarDate.vue";
import MobileTimePicker from "./MobileTimePicker.vue";
defineOptions({ options: { styleIsolation: "apply-shared" } });
const props = defineProps<{
  field: string;
  label: string;
  error?: string;
  disabled?: boolean;
  dateOnly?: boolean;
  disableFuture?: boolean;
  required?: boolean;
}>();
const day = defineModel<string>("date", { required: true });
const time = defineModel<string>("time", { default: "" });
const visible = ref(false);
const timeVisible = ref(false);
const dateLabel = computed(() => `选择${props.label.replace(/(时间|日期)$/, '')}日期`);
const timeLabel = computed(() => `选择${props.label.replace(/时间$/, '')}时间`);
const calendar = computed({
  get: () => new Date(day.value + "T12:00:00").getTime(),
  set: (value: number) => {
    const d = new Date(value);
    day.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },
});
</script>
<template>
  <MobileField :field="field" :label="label" :error="error" :required="required">
    <view class="mobile-date-time">
      <MobilePickerTrigger
        :id="field"
        :label="dateLabel"
        :value="day"
        :expanded="visible"
        :aria-controls="visible ? `${field}-date-dialog` : undefined"
        placeholder="选择日期"
        :disabled="disabled"
        @click="visible = true"
      />
      <MobilePickerTrigger
        v-if="!dateOnly"
        :id="field + '-time'"
        :label="timeLabel"
        :value="time"
        :expanded="timeVisible"
        placeholder="选择时间"
        :disabled="disabled"
        :aria-controls="timeVisible ? `${field}-time-dialog` : undefined"
        @click="timeVisible = true"
      />
    </view>
  </MobileField>
  <MobileCalendarDate
    v-model="calendar"
    v-model:visible="visible"
    :title="dateLabel"
    :trigger-id="field"
    :disable-future="disableFuture"
  />
  <MobileTimePicker
    v-if="!dateOnly"
    v-model="time"
    v-model:visible="timeVisible"
    :title="timeLabel"
    :trigger-id="field + '-time'"
  />
</template>
<style scoped>
.mobile-date-time {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
  gap: 8px;
  min-width: 0;
}
.mobile-date-time picker {
  display: block;
  min-width: 0;
}
</style>
