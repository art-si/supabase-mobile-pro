import type { InjectionKey, Ref } from 'vue'

export const mobileFieldContext: InjectionKey<Readonly<Ref<{
  describedBy?: string
  invalid: boolean
}>>> = Symbol('mobile-field')
