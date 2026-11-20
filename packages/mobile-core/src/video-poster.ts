import type { UploadSignal } from './upload-progress'

export interface VideoPosterOptions {
  /** An account/session boundary. Omit it to disable the reusable frame cache. */
  scope?: string | number
  /** Stable media id, independent of an expiring signed URL. */
  cacheKey?: string
  signal?: UploadSignal
  force?: boolean
}
type Listener = (poster: string) => void
type Job = { key: string; path: string; options: VideoPosterOptions; listeners: Set<Listener>; cancel?: () => void; done: boolean }
const pending: Job[] = []
const inFlight = new Map<string, Job>()
const frames = new Map<string, { scope: string | number; poster: string; expires: number }>()
const CACHE_TTL = 10 * 60 * 1000
const MAX_CACHE_BYTES = 8 * 1024 * 1024
let active = 0
function frameKey(options: VideoPosterOptions, path = '') {
  return options.scope == null ? '' : JSON.stringify([options.scope, options.cacheKey || path])
}
/** Keep genuine frames in bounded session memory, never in browser storage. */
export function rememberVideoPoster(poster: string, options: VideoPosterOptions) {
  const key = frameKey(options)
  if (!key || !options.cacheKey || !poster || poster.length * 2 > MAX_CACHE_BYTES) return
  frames.delete(key)
  frames.set(key, { scope: options.scope!, poster, expires: Date.now() + CACHE_TTL })
  let bytes = 0, count = 0
  for (const [id, frame] of [...frames].reverse()) {
    bytes += frame.poster.length * 2; count++
    if (frame.expires < Date.now() || bytes > MAX_CACHE_BYTES || count > 32) frames.delete(id)
  }
}
export function clearVideoPosterScope(scope: string | number) {
  for (const [key, frame] of frames) if (frame.scope === scope) frames.delete(key)
  for (const job of inFlight.values()) if (job.options.scope === scope) cancelJob(job)
}
function complete(job: Job, poster = '') {
  if (job.done) return
  job.done = true
  if (inFlight.get(job.key) === job) inFlight.delete(job.key)
  if (poster && job.listeners.size) rememberVideoPoster(poster, { ...job.options, cacheKey: job.options.cacheKey || job.path })
  for (const listener of job.listeners) listener(poster)
  job.listeners.clear()
}
function cancelJob(job: Job) {
  job.cancel?.()
  complete(job)
}
function drain() {
  while (active < 2 && pending.length) {
    const job = pending.shift()!
    if (job.done) continue
    active++
    void decodeVideoPoster(job.path, cancel => { job.cancel = cancel })
      .then(poster => complete(job, poster), () => complete(job))
      .finally(() => { active--; drain() })
  }
}
/** Deduplicate subscribers, allow independent cancellation, decode at most two videos. */
export function captureVideoPoster(path: string, options: VideoPosterOptions = {}): Promise<string> {
  if (!path || options.signal?.aborted) return Promise.resolve('')
  const cachedKey = frameKey(options, path), cached = frames.get(cachedKey)
  if (!options.force && cached && cached.expires > Date.now()) {
    frames.delete(cachedKey); frames.set(cachedKey, cached)
    return Promise.resolve(cached.poster)
  }
  if (cached) frames.delete(cachedKey)
  const key = JSON.stringify([options.scope, options.cacheKey, path])
  let job = inFlight.get(key)
  if (!job) {
    job = { key, path, options, listeners: new Set(), done: false }
    inFlight.set(key, job); pending.push(job)
  }
  const request = job
  const result = new Promise<string>(resolve => {
    const finish = (poster: string) => {
      options.signal?.removeEventListener('abort', abort)
      request.listeners.delete(finish)
      resolve(poster)
    }
    const abort = () => {
      finish('')
      if (!request.listeners.size) cancelJob(request)
    }
    request.listeners.add(finish)
    options.signal?.addEventListener('abort', abort)
  })
  drain()
  return result
}
/** Seek an actual decoded frame. A CORS/codec/network failure never becomes a fake cover. */
function decodeVideoPoster(path: string, registerCancel: (cancel: () => void) => void): Promise<string> {
  // #ifdef H5
  return new Promise(resolve => {
    const video = document.createElement('video')
    let settled = false, positioned = false
    const finish = (value = '') => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      video.onloadedmetadata = video.onloadeddata = video.oncanplay = video.onseeked = video.onerror = null
      video.pause(); video.removeAttribute('src'); video.load()
      resolve(value)
    }
    // Starts when a decoder slot is free; a slow queue does not consume this deadline.
    const timer = setTimeout(() => finish(), 12000)
    registerCancel(() => finish())
    const capture = () => {
      if (settled || !positioned || video.seeking || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
      try {
        const context = canvas.getContext('2d')
        if (!context) return finish()
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        finish(canvas.toDataURL('image/jpeg', .78))
      } catch { finish() }
    }
    const position = () => {
      if (positioned || settled) return
      positioned = true
      const target = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(.25, video.duration / 2) : 0
      try { if (target > 0) video.currentTime = target } catch { /* Some streams are not seekable; use the decoded current frame. */ }
      capture()
    }
    video.muted = true; video.playsInline = true; video.preload = 'auto'
    if (/^https?:/i.test(path)) video.crossOrigin = 'anonymous'
    video.onloadedmetadata = position
    video.onloadeddata = video.oncanplay = () => { position(); capture() }
    video.onseeked = capture
    video.onerror = () => finish()
    video.src = path; video.load()
  })
  // #endif
  // #ifndef H5
  // chooseMedia supplies a genuine thumbTempFilePath for newly selected native videos.
  // Remote native media needs a stored poster; no unsupported thumbnail API is invented.
  return Promise.resolve('')
  // #endif
}
