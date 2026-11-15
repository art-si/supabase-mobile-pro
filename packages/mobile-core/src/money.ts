export function formatCnyAmount(value: number | string | null | undefined) {
  if (value == null || (typeof value === 'string' && !value.trim())) return '—'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  const fixed = amount.toFixed(2)
  const decimal = fixed.indexOf('.')
  if (decimal < 0) return `¥${fixed}`
  return `¥${fixed.slice(0, decimal).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fixed.slice(decimal)}`
}
