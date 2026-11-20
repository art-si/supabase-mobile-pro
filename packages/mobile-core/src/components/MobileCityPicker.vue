<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from 'vue'
import { onHide } from '@dcloudio/uni-app'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'
import MobilePickerTrigger from './MobilePickerTrigger.vue'
import MobileBottomSheet from './MobileBottomSheet.vue'
import MobileSearch from './MobileSearch.vue'
import type { MobileCityOption, MobileDistrictOption } from '../city-options'

defineOptions({ options: { styleIsolation: 'apply-shared' } })
const props = defineProps<{
  cities: readonly MobileCityOption[]
  districts?: readonly MobileDistrictOption[]
  depth?: 'city' | 'district'
  allowPartial?: boolean
  label: string
  field?: string
  placeholder?: string
  currentLabel?: string
  compact?: boolean
  clearable?: boolean
  disabled?: boolean
  locate?: () => Promise<string>
  locateLabel?: string
  locatedLabel?: string
}>()
const model = defineModel<string>({ default: '' })
const opened = ref(false), query = ref(''), keyword = ref(''), provinceId = ref(''), cityId = ref(''), locating = ref(false), locationError = ref(''), keyboardHeight = ref(0)
const triggerId = props.field || `mobile-city-${getCurrentInstance()?.uid}`
const districtMode = computed(() => props.depth === 'district')
const provinces = computed(() => [...new Map(props.cities.map(city => [city.provinceId,{ id: city.provinceId, name: city.province }])).values()])
const selected = computed(() => (districtMode.value ? props.districts?.find(item=>item.id===model.value) : undefined) || props.cities.find(city => city.id === model.value) || (props.allowPartial ? provinces.value.find(item=>`province-${item.id}`===model.value) : undefined))
const province = computed(() => provinces.value.find(item => item.id === provinceId.value))
const city = computed(() => props.cities.find(item=>item.id===cityId.value))
const matches = computed(() => {
  const term = keyword.value.trim().toLowerCase()
  if (!term) return districtMode.value && cityId.value ? (props.districts||[]).filter(item=>item.cityId===cityId.value) : props.cities.filter(item => item.provinceId === provinceId.value)
  const cities=props.cities.filter(item => `${item.name} ${item.province}`.toLowerCase().includes(term))
  const districts=districtMode.value ? (props.districts||[]).filter(item=>item.name.toLowerCase().includes(term)) : []
  return [...new Map([...cities,...districts].map(item=>[item.id,item])).values()].sort((a,b) => Number(b.name.startsWith(term)) - Number(a.name.startsWith(term)))
})
const choices = computed(() => matches.value.slice(0,60))
let request = 0
watch(opened, open => {
  request++; locating.value = false; locationError.value = ''
  if (open) { query.value = ''; keyword.value = ''; provinceId.value = ''; cityId.value=''; keyboardHeight.value = 0 }
})
watch(keyword, () => { if (locating.value) { request++; locating.value = false } })
onHide(() => { opened.value = false })
function choose(id: string) { request++; model.value = id; opened.value = false }
function chooseOption(item:MobileCityOption){
 if(!districtMode.value || 'cityId' in item){choose(item.id);return}
 const children=(props.districts||[]).filter(district=>district.cityId===item.id)
 if(!children.length || children.length===1 && children[0]?.id===item.id){choose(item.id);return}
 request++;locating.value=false;provinceId.value=item.provinceId;cityId.value=item.id;query.value='';keyword.value=''
}
function back(){if(cityId.value)cityId.value='';else provinceId.value=''}
function browse(id: string) {
  request++; locating.value = false
  const cities = props.cities.filter(city => city.provinceId === id)
  if (cities.length === 1 && cities[0]) chooseOption(cities[0])
  else provinceId.value = id
}
async function locateCurrent() {
  if (!props.locate || locating.value) return
  const current = ++request
  locating.value = true; locationError.value = ''
  try {
    const id = await props.locate()
    if (current !== request || !opened.value) return
    if (!props.cities.some(city => city.id === id) && !props.districts?.some(item=>item.id===id)) throw new Error('无法识别所在地区，请手动选择。')
    choose(id)
  } catch (error) {
    if (current === request && opened.value) locationError.value = error instanceof Error ? error.message : '定位失败，请手动选择城市。'
  } finally { if (current === request) locating.value = false }
}
</script>
<template>
  <view class="mobile-city-picker" :class="{ 'is-compact': compact }">
    <MobilePickerTrigger :id="triggerId" :value="districtMode ? currentLabel || selected?.name : selected?.name || currentLabel" :placeholder="placeholder || (districtMode ? '选择省、市、区县' : '选择城市')" :label="label" :expanded="opened" :disabled="disabled" :aria-controls="opened ? `${triggerId}-dialog` : undefined" @click="opened = true" />
    <MobileBottomSheet v-model="opened" :title="label" :close-label="districtMode ? '关闭地区选择' : '关闭城市选择'" :trigger-id="triggerId" :dialog-id="`${triggerId}-dialog`" :keyboard-height="keyboardHeight" :body-height="380" root-portal :z-index="180">
      <template #toolbar><MobileSearch v-model="query" :name="`${triggerId}-search`" :label="districtMode ? '搜索地区' : '搜索城市'" :placeholder="districtMode ? '搜索省、市或区县' : '搜索城市或省份'" live :debounce="0" fit-keyboard @search="keyword = $event" @keyboard="keyboardHeight = $event" /></template>
      <view class="mobile-city-picker__body">
        <MobileAction v-if="props.locate" class="mobile-city-picker__locate" :disabled="locating" :aria-label="locating ? (districtMode ? '正在定位地区…' : '正在定位城市…') : locateLabel || (districtMode ? '定位当前地区' : '定位当前城市')" @click="locateCurrent"><MobileIcon name="locate" size="20px" /><view class="mobile-city-picker__name"><text>{{ locating ? (districtMode ? '正在定位地区…' : '正在定位城市…') : locateLabel || (districtMode ? '定位当前地区' : '定位当前城市') }}</text><text v-if="locatedLabel" class="mobile-city-picker__caption">{{ locatedLabel }}</text></view></MobileAction>
        <text v-if="locationError" class="mobile-city-picker__message" role="alert">{{ locationError }}</text>
        <template v-if="!keyword.trim() && !provinceId">
          <view v-if="selected" class="mobile-city-picker__current"><text class="mobile-city-picker__caption">当前选择</text><MobileAction class="mobile-city-picker__city is-selected" :aria-label="`选择${selected.name}`" @click="choose(model)"><text>{{ districtMode ? currentLabel || selected.name : selected.name }}</text><MobileIcon name="check" size="20px" /></MobileAction></view>
          <text class="mobile-city-picker__caption">按省份选择</text>
          <view class="mobile-city-picker__provinces"><MobileAction v-for="item in provinces" :key="item.id" class="mobile-city-picker__province" @click="browse(item.id)">{{ item.name }}</MobileAction></view>
        </template>
        <template v-else>
          <MobileAction v-if="!keyword.trim()" class="mobile-city-picker__back" @click="back"><MobileIcon name="back" size="18px" /><text>{{ city?.name || province?.name }} · {{ cityId ? '返回城市' : '返回省份' }}</text></MobileAction>
          <MobileAction v-if="districtMode && !keyword.trim() && (cityId || allowPartial && provinceId)" class="mobile-city-picker__city" @click="choose(cityId || `province-${provinceId}`)">只选择{{ city?.name || province?.name }}</MobileAction>
          <MobileAction v-for="item in choices" :key="item.id" class="mobile-city-picker__city" :class="{ 'is-selected': item.id === model }" :aria-label="`选择${item.name}`" :aria-pressed="item.id === model" @click="chooseOption(item)"><view class="mobile-city-picker__name"><text>{{ item.name }}</text><text v-if="keyword.trim()" class="mobile-city-picker__caption">{{ item.province }}{{ 'city' in item ? ' · '+item.city : '' }}</text></view><MobileIcon v-if="item.id === model" name="check" size="20px" /></MobileAction>
          <text v-if="!choices.length" class="mobile-city-picker__message" role="status">没有找到匹配地区，请换个名称。</text>
          <text v-if="matches.length > choices.length" class="mobile-city-picker__message" role="status">匹配城市较多，请补充城市名称。</text>
        </template>
      </view>
      <template v-if="clearable && (model || currentLabel)" #footer><MobileAction class="mobile-city-picker__clear" @click="choose('')">清空城市</MobileAction></template>
    </MobileBottomSheet>
  </view>
</template>
<style scoped>
.mobile-city-picker { min-width: 0; }
.mobile-city-picker.is-compact { width: fit-content; max-width: 100%; }
.mobile-city-picker__body { padding: 0 16px 16px; color: var(--mobile-workspace-ink,var(--tms-text)); }
.mobile-city-picker__locate.mobile-action { display: flex; align-items: center; gap: 10px; min-height: 52px; width: 100%; padding: 10px 12px; color: var(--mobile-workspace-accent,var(--tms-primary)); text-align: left; font-size: 1rem; }
.mobile-city-picker__caption { display: block; color: var(--mobile-workspace-muted,var(--tms-muted)); font-size: .8125rem; line-height: 1.5; }
.mobile-city-picker__body > .mobile-city-picker__caption { padding: 12px; }
.mobile-city-picker__current { padding: 8px 0; }
.mobile-city-picker__current > .mobile-city-picker__caption { padding: 0 12px 8px; }
.mobile-city-picker__provinces { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,8rem),1fr)); gap: 4px 8px; }
.mobile-city-picker__province.mobile-action { display: flex; align-items: center; justify-content: flex-start; width: 100%; min-height: 48px; padding: 10px 12px; text-align: left; font-size: 1rem; line-height: 1.5; }
.mobile-city-picker__city.mobile-action { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; width: 100%; padding: 10px 12px; border-bottom: 1px solid var(--mobile-workspace-line,var(--tms-line)); text-align: left; font-size: 1rem; line-height: 1.45; }
.mobile-city-picker__city.is-selected { border-radius: 10px; color: var(--mobile-workspace-accent,var(--tms-primary)); background: var(--tms-primary-soft); font-weight: 600; }
.mobile-city-picker__name { display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.mobile-city-picker__back.mobile-action { display: flex; align-items: center; gap: 8px; min-height: 48px; width: 100%; padding: 8px 12px; color: var(--mobile-workspace-accent,var(--tms-primary)); text-align: left; font-size: .875rem; }
.mobile-city-picker__message { display: block; padding: 8px 12px; color: var(--mobile-workspace-muted,var(--tms-muted)); font-size: .875rem; line-height: 1.5; overflow-wrap: anywhere; }
.mobile-city-picker__clear.mobile-action { min-height: 48px; width: 100%; color: var(--mobile-workspace-accent,var(--tms-primary)); font-size: 1rem; }
</style>
