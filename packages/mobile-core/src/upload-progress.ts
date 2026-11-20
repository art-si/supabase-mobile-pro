export interface UploadSignal {
  readonly aborted: boolean;
  addEventListener(
    type: "abort",
    listener: () => void,
    options?: { once?: boolean },
  ): void;
  removeEventListener(type: "abort", listener: () => void): void;
}
export interface UploadOptions {
  onProgress?: (percentage: number) => void;
  onStage?: (stage: 'preparing' | 'uploading') => void;
  onPreparationProgress?: (percentage: number) => void;
  /** Return true to take ownership of this local preview copy and its disposer. */
  onPreparedMedia?: (media: { path: string; dispose: () => void }) => boolean;
  signal?: UploadSignal;
}
/** Mini-program-compatible cancellation with an optional parent lifecycle signal. */
export function createUploadCancellation(parent?: UploadSignal) {
  let aborted = false;
  const listeners = new Map<() => void, boolean>();
  const signal: UploadSignal = {
    get aborted() { return aborted; },
    addEventListener(_type, listener, options) { listeners.set(listener, Boolean(options?.once)); },
    removeEventListener(_type, listener) { listeners.delete(listener); },
  };
  const dispose = () => parent?.removeEventListener('abort', abort);
  function abort() {
    if (aborted) return;
    aborted = true; dispose();
    for (const [listener, once] of listeners) {
      if (once) listeners.delete(listener);
      try { listener(); } catch { /* One subscriber cannot prevent the remaining cleanup. */ }
    }
    listeners.clear();
  }
  parent?.addEventListener('abort', abort, { once: true });
  if (parent?.aborted) abort();
  return { signal, abort, dispose };
}
/** Exposes only actual transport progress; cancellation also settles a stalled native bridge. */
export function trackUpload(
  task: UniApp.UploadTask,
  options: UploadOptions,
  abort: () => void,
) {
  const onProgress = (event: UniApp.OnProgressUpdateResult) => {
    if (Number.isFinite(event.progress))
      options.onProgress?.(Math.max(0, Math.min(100, event.progress)));
  };
  const onAbort = () => {
    try {
      task.abort();
    } catch {}
    abort();
  };
  try {
    task.onProgressUpdate?.(onProgress);
  } catch {}
  options.signal?.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) onAbort();
  return () => {
    options.signal?.removeEventListener("abort", onAbort);
    try {
      task.offProgressUpdate?.(onProgress);
    } catch {}
  };
}
