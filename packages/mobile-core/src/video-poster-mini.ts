import { encodeVideoFramePng } from './video-frame-png'

type NativeFrame = { width: number; height: number; data: ArrayBuffer }
type NativeDecoder = {
  start(options: { source: string; mode: number; abortAudio: boolean }): Promise<unknown>
  getFrameData(): NativeFrame | null
  stop(): Promise<unknown>
  remove(): Promise<unknown>
}
type NativeDownload = {
  abort(): void
  onProgressUpdate?(callback: (event: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void): void
  onHeadersReceived?(callback: (event: { header: Record<string, unknown> }) => void): void
}
type PosterWx = {
  createVideoDecoder?: () => NativeDecoder
  arrayBufferToBase64?: (data: ArrayBuffer) => string
  downloadFile(options: { url: string; timeout: number; success(result: { statusCode: number; tempFilePath: string }): void; fail(): void }): NativeDownload
  getFileSystemManager(): {
    getFileInfo(options: { filePath: string; success(result: { size: number }): void; fail(): void }): void
    unlink(options: { filePath: string; fail?(): void }): void
  }
}
// The service runtime injects wx directly; it need not be a globalThis property.
declare const wx: PosterWx | undefined
/** Official VideoDecoder (2.11+) returns real frames; unsupported codecs/APIs fail closed.
 * Remote sources are downloaded first so progress, size and temporary-file ownership
 * remain bounded. No native video/canvas elements are mounted in scrolling lists.
 */
export function decodeWeixinVideoPoster(path: string, registerCancel: (cancel: () => void) => void): Promise<string> {
  const bridge = typeof wx === 'undefined' ? undefined : wx
  if (!bridge?.createVideoDecoder || !bridge.arrayBufferToBase64) return Promise.resolve('')
  const maximum = 20 * 1024 * 1024
  return new Promise(resolve => {
    let settled = false, downloaded = '', decoder: NativeDecoder | undefined, task: NativeDownload | undefined
    let poll: ReturnType<typeof setTimeout> | undefined
    const removeFile = (filePath: string) => {
      try { bridge.getFileSystemManager().unlink({ filePath, fail() {} }) } catch { /* A native temporary file may already be gone. */ }
    }
    const finish = (poster = '') => {
      if (settled) return
      settled = true; clearTimeout(timer); clearTimeout(poll)
      try { task?.abort() } catch {}
      // Both operations can reject after native teardown; neither may strand the queue.
      try { void Promise.resolve(decoder?.stop()).catch(() => {}) } catch {}
      try { void Promise.resolve(decoder?.remove()).catch(() => {}) } catch {}
      if (downloaded) removeFile(downloaded)
      resolve(poster)
    }
    const timer = setTimeout(() => finish(), 15000)
    registerCancel(() => finish())
    const readFrame = () => {
      if (settled) return
      try {
        const frame = decoder?.getFrameData()
        if (frame) {
          const png = encodeVideoFramePng(frame)
          if (!png) return finish()
          return finish(`data:image/png;base64,${bridge.arrayBufferToBase64!(png.buffer as ArrayBuffer)}`)
        }
        poll = setTimeout(readFrame, 32)
      } catch { finish() }
    }
    const decode = (source: string) => {
      if (settled) return
      try {
        decoder = bridge.createVideoDecoder!()
        void Promise.resolve(decoder.start({ source, mode: 0, abortAudio: true })).then(() => {
          if (settled) return
          readFrame()
        }, () => finish())
      } catch { finish() }
    }
    const inspect = (source: string) => {
      if (settled) return
      try {
        bridge.getFileSystemManager().getFileInfo({ filePath: source,
          success: ({ size }) => {
            if (!Number.isFinite(size) || size < 1 || size > maximum) return finish()
            decode(source)
          }, fail: () => finish(),
        })
      } catch { finish() }
    }
    // Developer Tools uses http://tmp/... for genuine local chooseMedia paths.
    if (!/^https?:\/\//i.test(path) || /^https?:\/\/tmp\//i.test(path)) { inspect(path); return }
    try {
      task = bridge.downloadFile({ url: path, timeout: 12000,
        success: result => {
          // Aborted native bridges can still deliver a success callback; own and unlink it.
          if (settled) { if (result.tempFilePath) removeFile(result.tempFilePath); return }
          downloaded = result.tempFilePath
          if (result.statusCode !== 200 || !downloaded) return finish()
          inspect(downloaded)
        }, fail: () => finish(),
      })
      task.onProgressUpdate?.(event => {
        if (event.totalBytesWritten > maximum || event.totalBytesExpectedToWrite > maximum) finish()
      })
      task.onHeadersReceived?.(({ header }) => {
        const length = Object.entries(header).find(([name]) => name.toLowerCase() === 'content-length')?.[1]
        if (Number(length) > maximum) finish()
      })
      if (settled) { try { task.abort() } catch {} }
    } catch { finish() }
  })
}
