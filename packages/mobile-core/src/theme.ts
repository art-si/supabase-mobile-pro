import { computed } from 'vue'
import { defineStore } from 'pinia'

export const THEME_PRESETS = [
  { id: 'indigo', name: '经典靛蓝', description: '沉稳清晰', color: '#4f46e5' },
  { id: 'ocean', name: '海洋蓝', description: '明快可靠', color: '#155eef' },
  { id: 'forest', name: '青松绿', description: '平和专注', color: '#0f766e' }
] as const

export type ThemePresetId = (typeof THEME_PRESETS)[number]['id']

const defaultPreset = THEME_PRESETS[0]

function savedPreset(storageKey: string): ThemePresetId {
  try {
    const value: unknown = uni.getStorageSync(storageKey)
    return THEME_PRESETS.find((preset) => preset.id === value)?.id ?? defaultPreset.id
  } catch {
    return defaultPreset.id
  }
}

export function createThemeStore(storageKey: string) {
  return defineStore('theme', {
    state: () => ({ preset: savedPreset(storageKey) }),
    getters: {
      // Native map polylines need a hex color.
      mapColor: (state) => THEME_PRESETS.find((preset) => preset.id === state.preset)?.color ?? defaultPreset.color
    },
    actions: {
      selectPreset(preset: ThemePresetId): boolean {
        if (this.preset === preset) return true
        this.preset = preset
        try {
          uni.setStorageSync(storageKey, preset)
          return true
        } catch {
          return false
        }
      }
    }
  })
}

export function createUsePageTheme<Theme extends { preset: ThemePresetId }>(
  useThemeStore: () => Theme,
  prefix: string
) {
  return function usePageTheme() {
    const theme = useThemeStore()
    return {
      theme,
      themeName: computed(() => `${prefix}-${theme.preset}`)
    }
  }
}
