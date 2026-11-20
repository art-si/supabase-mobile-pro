/** Bounded, deduplicated work queue. Clearing aborts active work and discards waiting work. */
import type { UploadSignal } from "./upload-progress";
function cancellation() {
  let aborted = false;
  const listeners = new Set<() => void>();
  const signal: UploadSignal = {
    get aborted() {
      return aborted;
    },
    addEventListener(_type, listener) {
      listeners.add(listener);
    },
    removeEventListener(_type, listener) {
      listeners.delete(listener);
    },
  };
  return {
    signal,
    abort() {
      if (aborted) return;
      aborted = true;
      listeners.forEach((listener) => listener());
      listeners.clear();
    },
  };
}
export function createUploadQueue<T extends { key: string }>(
  run: (item: T, signal: UploadSignal) => Promise<void>,
  concurrency = 3,
) {
  const jobs = new Map<
    string,
    { item: T; controller: ReturnType<typeof cancellation> }
  >();
  const waiting: { item: T; controller: ReturnType<typeof cancellation> }[] =
    [];
  let active = 0,
    paused = false;
  function drain() {
    while (!paused && active < concurrency && waiting.length) {
      const job = waiting.shift()!;
      if (job.controller.signal.aborted) continue;
      active++;
      void Promise.resolve()
        .then(() => run(job.item, job.controller.signal))
        .catch(() => {})
        .finally(() => {
          active--;
          if (jobs.get(job.item.key) === job) jobs.delete(job.item.key);
          drain();
        });
    }
  }
  return {
    enqueue(item: T) {
      if (jobs.has(item.key)) return;
      const job = { item, controller: cancellation() };
      jobs.set(item.key, job);
      waiting.push(job);
      drain();
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      drain();
    },
    clear() {
      jobs.forEach((job) => job.controller.abort());
      jobs.clear();
      waiting.splice(0);
      paused = false;
    },
    remove(key: string) {
      const job = jobs.get(key);
      if (job) {
        job.controller.abort();
        jobs.delete(key);
      }
    },
  };
}
