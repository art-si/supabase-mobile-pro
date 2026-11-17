export function preventActionKey(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return false
  event.preventDefault()
  event.stopPropagation()
  return true
}

export function activateActionKey(event: KeyboardEvent, activate: () => void) {
  if (preventActionKey(event)) activate()
}
