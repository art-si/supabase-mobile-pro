<script setup lang="ts">
import { computed, ref } from 'vue'
import MobileIcon from './MobileIcon.vue'

defineOptions({ options: { styleIsolation: 'apply-shared' } })

const props = defineProps<{ name: string; detail?: string; initials?: boolean; avatarUrl?: string }>()
const loadedAvatarUrl = ref('')
const initial = computed(() => props.initials ? Array.from(props.name.trim())[0] : '')
const avatarReady = computed(() => Boolean(props.avatarUrl && loadedAvatarUrl.value === props.avatarUrl))
</script>

<template>
  <view class="mobile-group mobile-account-card">
    <view class="mobile-row mobile-row--static mobile-account-identity">
      <view class="mobile-icon-box mobile-account-identity__avatar" aria-hidden="true">
        <template v-if="!avatarReady">
          <text v-if="initial">{{ initial }}</text>
          <MobileIcon v-else name="user" size="22px" />
        </template>
        <image
          v-if="avatarUrl" :key="avatarUrl" :src="avatarUrl" mode="aspectFill"
          class="mobile-account-identity__photo" :class="{ 'mobile-account-identity__photo--ready': avatarReady }"
          @load="loadedAvatarUrl = avatarUrl" @error="loadedAvatarUrl = ''"
        />
      </view>
      <view class="mobile-row__body mobile-account-identity__copy">
        <text class="mobile-account-identity__name" role="heading" aria-level="2">{{ name }}</text>
        <text v-if="detail" class="mobile-row__detail mobile-account-identity__detail">{{ detail }}</text>
      </view>
      <slot name="action" />
    </view>
    <slot name="details" />
  </view>
</template>

<style scoped lang="scss">
.mobile-account-identity.mobile-row {
  gap: 12px;
  padding-block: 16px;
}

.mobile-account-identity__avatar {
  position: relative;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 16px;
  color: var(--mobile-workspace-accent, var(--tms-primary, var(--smis-primary)));
  background: var(--tms-primary-soft, var(--smis-primary-soft));
  font-size: max(20px, 1.25rem);
  font-weight: 700;
}

.mobile-account-identity__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}

.mobile-account-identity__photo--ready { opacity: 1; }
.mobile-account-identity__copy { gap: 4px; }
.mobile-account-identity__name {
  color: var(--mobile-workspace-ink, var(--tms-text-strong, var(--smis-text-strong)));
  font-size: clamp(1.125rem, 5.2vw, 1.375rem);
  font-weight: 700;
  line-height: 1.35;
}

.mobile-account-identity__detail { font-size: max(13px, .8125rem); }
</style>
