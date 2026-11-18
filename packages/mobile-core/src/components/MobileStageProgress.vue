<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { virtualHost: true, styleIsolation: 'apply-shared' } })

const props = defineProps<{ label: string; steps: readonly string[]; current: number }>()
const descriptionId = `mobile-stage-progress-${getCurrentInstance()?.uid}`
const description = computed(() => `${props.steps[props.current]}，第 ${props.current + 1} 阶段，共 ${props.steps.length} 阶段`)
</script>

<template>
  <view
    v-if="steps.length"
    class="mobile-stage-progress"
    role="progressbar"
    :aria-label="label"
    :aria-valuemin="0"
    :aria-valuemax="steps.length - 1"
    :aria-valuenow="current"
    :aria-valuetext="description"
    :aria-describedby="descriptionId"
    :style="{ '--mobile-stage-count': steps.length }"
  >
    <text :id="descriptionId" hidden>{{ description }}</text>
    <view
      v-for="(step, index) in steps"
      :key="index"
      class="progress__step"
      :class="{
        'progress__step--completed': index < current,
        'progress__step--current': index === current
      }"
      aria-hidden="true"
    >
      <view class="progress__marker">
        <view v-if="index < steps.length - 1" class="progress__rail" />
        <view class="progress__dot mobile-icon-box">
          <MobileIcon v-if="index < current" name="check" size="11px" />
        </view>
      </view>
      <text class="progress__label">{{ step }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.mobile-stage-progress {
  --stage-accent: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  --stage-ink: var(--mobile-workspace-muted, var(--tms-text-secondary, var(--smis-text-secondary)));
  --stage-surface: var(--mobile-workspace-surface, var(--tms-surface, var(--smis-surface)));
  --stage-track: var(--mobile-workspace-line, var(--tms-line, var(--smis-line)));
  display: grid;
  grid-template-columns: repeat(var(--mobile-stage-count), minmax(0, 1fr));
  align-items: start;
  min-width: 0;
}

.progress__step { display: grid; min-width: 0; gap: 4px; text-align: center; }
.progress__label {
  color: var(--stage-ink);
  padding-inline: 1px;
  font-size: max(12px, .75rem);
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.progress__step--completed .progress__label { color: var(--stage-accent); font-weight: 650; }
.progress__step--current .progress__label { color: var(--stage-accent); font-weight: 720; }

.progress__marker { position: relative; display: grid; height: 22px; place-items: center; }
.progress__rail {
  position: absolute;
  inset: calc(50% - 1px) -50% auto 50%;
  height: 2px;
  background: var(--stage-track);
}
.progress__step--completed .progress__rail { background: var(--stage-accent); }
.progress__dot {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 10px;
  height: 10px;
  border: 2px solid var(--stage-surface);
  border-radius: 50%;
  background: var(--stage-track);
  box-shadow: 0 0 0 1px var(--stage-track);
}
.progress__step--completed .progress__dot {
  width: 16px;
  height: 16px;
  border: 0;
  color: #fff;
  background: var(--stage-accent);
}
.progress__step--current .progress__dot {
  width: 16px;
  height: 16px;
  border: 3px solid var(--stage-surface);
  background: var(--stage-accent);
  box-shadow: 0 0 0 2px var(--stage-accent);
}
</style>
