/** Keep list loading, results, and errors owned by the current query. */
export function createLatestRequest() {
  let generation = 0

  function snapshot() {
    const captured = generation
    return () => captured === generation
  }

  function invalidate() {
    generation += 1
  }

  return {
    start() {
      invalidate()
      return snapshot()
    },
    snapshot,
    invalidate
  }
}
