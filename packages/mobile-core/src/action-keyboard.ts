function consumeActionKey(event: KeyboardEvent) {
  if (event.isComposing || (event.key !== 'Enter' && event.key !== ' ')) return false
  event.preventDefault()
  event.stopPropagation()
  return true
}

// #ifdef H5
const pressed = new WeakMap<EventTarget, string>()

function actionControl(event: KeyboardEvent) {
  if (event.currentTarget instanceof EventTarget) return event.currentTarget
  // Uni's built-in controls expose a fresh metadata object for currentTarget.
  return typeof document === 'undefined' ? null : document.activeElement
}

function clearOnBlur(event: Event) {
  if (event.currentTarget) pressed.delete(event.currentTarget)
}
// #endif

export function preventActionKey(event: KeyboardEvent) {
  if (!consumeActionKey(event)) return false
  // #ifdef H5
  const target = actionControl(event)
  if (target && !event.repeat) {
    pressed.set(target, event.key)
    target.addEventListener('blur', clearOnBlur, { once: true })
  }
  // #endif
  return true
}

export function activateActionKey(event: KeyboardEvent, activate: () => void) {
  if (!consumeActionKey(event)) return
  // #ifdef H5
  const target = actionControl(event)
  if (!target) return
  const started = pressed.get(target) === event.key
  pressed.delete(target)
  target.removeEventListener('blur', clearOnBlur)
  // A native button can open a dialog on keydown and move focus before keyup.
  if (!started) return
  // #endif
  activate()
}

/** Reuse the owning button's click handler instead of duplicating its action. */
export function activateButtonKey(event: KeyboardEvent) {
  // #ifdef H5
  const target = actionControl(event)
  activateActionKey(event, () => {
    if (!(target instanceof HTMLElement) || target.getAttribute('aria-disabled') === 'true' ||
        target.hasAttribute('disabled')) return
    target.click()
  })
  // #endif
}
