export function parseLoginAccount(value: string) {
  const account = value.trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) {
    return { type: 'email' as const, value: account }
  }

  if (!/^[+\d\s()-]+$/.test(account)) return null
  const phone = account.replace(/[\s()-]/g, '')
  if (/^1\d{10}$/.test(phone)) return { type: 'phone' as const, value: `+86${phone}`, local: phone }
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return { type: 'phone' as const, value: phone, local: phone }
  return null
}
