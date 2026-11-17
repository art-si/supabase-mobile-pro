/** Keep the first position for each key and its newest returned row. */
export function mergePageRows<T, Key>(previous: readonly T[], incoming: readonly T[], key: (item: T) => Key): T[] {
  const rows = new Map<Key, T>()
  for (const item of previous) rows.set(key(item), item)
  for (const item of incoming) rows.set(key(item), item)
  return [...rows.values()]
}
