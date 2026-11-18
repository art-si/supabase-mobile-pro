export const CALENDAR_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

/** Sunday-first calendar, with zeroes for the leading positions outside this month. */
export function monthDayNumbers(year: number, monthIndex: number) {
  const offset = new Date(year, monthIndex, 1).getDay()
  const count = new Date(year, monthIndex + 1, 0).getDate()
  return Array.from({ length: offset + count }, (_, index) => Math.max(0, index - offset + 1))
}
