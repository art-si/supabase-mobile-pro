import type { UploadOptions, UploadSignal } from './upload-progress'
// #ifdef H5
import { createUploadCancellation } from './upload-progress'
// #endif

export type VideoPreparationCode = 'VIDEO_TOO_LARGE' | 'VIDEO_UNSUPPORTED' | 'VIDEO_CONVERSION_UNAVAILABLE' | 'VIDEO_CONVERSION_FAILED' | 'UPLOAD_CANCELLED'
export class VideoPreparationError extends Error {
  constructor(readonly code: VideoPreparationCode) { super(code) }
}
export interface PreparedUploadVideo { path: string; size: number; dispose(): void }
export interface BrowserVideoConversionOptions { maxBytes: number; signal?: UploadSignal; onProgress?: (percentage: number) => void }
export type BrowserVideoConverter = (source: Blob, options: BrowserVideoConversionOptions) => Promise<Blob>
export interface VideoPreparationOptions extends UploadOptions { convertBrowserVideo?: BrowserVideoConverter }
export interface Mp4VideoInspection { compatible: boolean; videoTracks: number; audioTracks: number; width: number; height: number }

const failed = () => new VideoPreparationError('VIDEO_CONVERSION_FAILED')
const cancelled = () => new VideoPreparationError('UPLOAD_CANCELLED')
function checkAbort(signal?: UploadSignal) { if (signal?.aborted) throw cancelled() }
function checkSize(size: number, maximum: number) {
  if (!Number.isSafeInteger(size) || size < 32) throw new VideoPreparationError('VIDEO_UNSUPPORTED')
  if (size > maximum) throw new VideoPreparationError('VIDEO_TOO_LARGE')
}

/** Small bounds-checked ISO BMFF probe for native preparation and post-conversion verification.
 * It never authenticates media: the server still validates and removes private metadata. */
export function inspectMp4Video(bytes: Uint8Array): Mp4VideoInspection | null {
  interface Box { start: number; data: number; end: number; type: string }
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const text = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4))
    let count = 0
    const boxes = (start: number, end: number): Box[] => {
      const list: Box[] = []
      for (let at = start; at < end;) {
        if (++count > 30000 || end - at < 8) throw failed()
        let size = view.getUint32(at), header = 8
        if (size === 1) {
          if (end - at < 16) throw failed()
          const large = view.getBigUint64(at + 8)
          if (large > BigInt(bytes.length)) throw failed()
          size = Number(large); header = 16
        }
        if (size === 0) size = end - at
        if (size < header || size > end - at) throw failed()
        list.push({ start: at, data: at + header, end: at + size, type: text(at + 4) }); at += size
      }
      return list
    }
    const child = (box: Box | undefined, name: string) => box && boxes(box.data, box.end).find(item => item.type === name)
    const top = boxes(0, bytes.length), ftyp = top.find(item => item.type === 'ftyp'), movies = top.filter(item => item.type === 'moov')
    if (!ftyp || ftyp.end - ftyp.data < 8 || movies.length !== 1 || !top.some(item => item.type === 'mdat' && item.end > item.data)) return null
    const brands: string[] = []
    for (let at = ftyp.data; at + 4 <= ftyp.end; at += 4) if (at !== ftyp.data + 4) brands.push(text(at))
    let compatible = brands.some(brand => ['isom','iso2','iso3','iso4','iso5','iso6','mp41','mp42','avc1','M4V ','dash'].includes(brand))
    let videoTracks = 0, audioTracks = 0, width = 0, height = 0
    const aac = (entry: Box): boolean => {
      if (entry.end - entry.start < 36) return false
      const version = view.getUint16(entry.start + 16)
      if (version > 1) return false
      const esds = boxes(entry.start + 36 + (version === 1 ? 16 : 0), entry.end).find(box => box.type === 'esds')
      if (!esds || esds.end - esds.data < 6) return false
      const descriptor = (at: number, end: number, depth = 0): boolean => {
        if (depth > 3 || at + 2 > end) return false
        const tag = bytes[at++]!; let length = 0, last = 0
        for (let n = 0; n < 4; n++) { if (at >= end) return false; last = bytes[at++]!; length = length * 128 + (last & 127); if (!(last & 128)) break }
        if (last & 128 || at + length > end) return false
        const limit = at + length
        if (tag === 4) return length >= 13 && bytes[at] === 0x40
        if (tag !== 3 || length < 3) return false
        const flags = bytes[at + 2]!; at += 3
        if (flags & 128) at += 2
        if (flags & 64) { if (at >= limit) return false; at += 1 + bytes[at]! }
        if (flags & 32) at += 2
        return descriptor(at, limit, depth + 1)
      }
      return descriptor(esds.data + 4, esds.end)
    }
    const movie = movies[0]! // The top-level validation requires exactly one moov box.
    for (const track of boxes(movie.data, movie.end).filter(box => box.type === 'trak')) {
      const mdia = child(track,'mdia'), handler = child(mdia,'hdlr'), stsd = child(child(child(mdia,'minf'),'stbl'),'stsd')
      if (!handler || handler.end - handler.data < 12 || !stsd || stsd.end - stsd.data < 8) return null
      const descriptions = boxes(stsd.data + 8,stsd.end), type = text(handler.data + 8)
      if (!descriptions.length || view.getUint32(stsd.data + 4) !== descriptions.length) return null
      if (type === 'vide') {
        videoTracks++
        const first = descriptions[0]! // Non-empty sample descriptions were checked above.
        if (first.end - first.start < 86) return null
        width = view.getUint16(first.start + 32); height = view.getUint16(first.start + 34)
        compatible &&= descriptions.every(entry => ['avc1','avc3'].includes(entry.type))
      } else if (type === 'soun') { audioTracks++; compatible &&= descriptions.every(entry => entry.type === 'mp4a' && aac(entry)) }
      else compatible = false
    }
    return { compatible: compatible && videoTracks === 1 && width > 0 && height > 0 && width <= 8192 && height <= 8192, videoTracks, audioTracks, width, height }
  } catch { return null }
}

function pending<T>(start: (resolve: (value: T) => void, reject: (error?: unknown) => void) => void, signal?: UploadSignal, late?: (value: T) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
    const fail = (error: Error) => { if (settled) return; settled = true; cleanup(); reject(error) }
    const abort = () => fail(cancelled())
    const timer = setTimeout(() => fail(failed()),120000)
    signal?.addEventListener('abort',abort,{once:true})
    if (signal?.aborted) { abort(); return }
    try { start(value => { if (settled) { late?.(value); return }; settled = true; cleanup(); resolve(value) }, error => fail(error instanceof VideoPreparationError ? error : failed())) }
    catch { fail(failed()) }
  })
}

// #ifdef H5
async function browserVideo(path: string, maximum: number, options: VideoPreparationOptions): Promise<PreparedUploadVideo> {
  if (!path.startsWith('blob:')) throw failed()
  const cancellation = createUploadCancellation(options.signal)
  options = {...options,signal:cancellation.signal}
  try {
  const source = await pending<Blob>((resolve,reject) => { fetch(path).then(response => response.ok ? response.blob() : Promise.reject()).then(resolve,reject) },options.signal)
  checkAbort(options.signal); checkSize(source.size,maximum)
  const original = inspectMp4Video(new Uint8Array(await source.arrayBuffer()))
  checkAbort(options.signal)
  if (original?.compatible) return { path, size: source.size, dispose() {} }
  if (!options.convertBrowserVideo) throw new VideoPreparationError('VIDEO_CONVERSION_UNAVAILABLE')
  // The loader itself can be waiting for a module download before its converter has
  // installed a cancellation listener. Keep cancellation responsive across that phase.
  const output = await pending<Blob>((resolve,reject) => options.convertBrowserVideo!(source,{maxBytes:maximum,signal:options.signal,onProgress:options.onPreparationProgress}).then(resolve,reject),options.signal)
  checkAbort(options.signal); checkSize(output.size,maximum)
  const converted = inspectMp4Video(new Uint8Array(await output.arrayBuffer()))
  checkAbort(options.signal)
  if (!converted?.compatible || original && converted.audioTracks !== original.audioTracks) throw failed()
  const result = URL.createObjectURL(output); let disposed = false
  return { path: result, size: output.size, dispose() { if (!disposed) URL.revokeObjectURL(result); disposed = true } }
  } finally {
    // Includes the preparation timeout: a timed-out caller must not leave codecs
    // converting in the background after its upload entry has already failed.
    cancellation.abort(); cancellation.dispose()
  }
}
// #endif

// #ifndef H5
function releaseVideoCopy(path: string, original: string) {
  if (path && path !== original) try { uni.getFileSystemManager().unlink({filePath:path,fail(){}}) } catch { /* Temporary files also expire with the platform. */ }
}
async function nativeBytes(path: string, maximum: number, signal?: UploadSignal) {
  const file = await pending<UniApp.GetFileInfoSuccess>((resolve,reject) => uni.getFileInfo({filePath:path,success:resolve,fail:reject}),signal)
  checkSize(file.size,maximum)
  const data = await pending<ArrayBuffer>((resolve,reject) => uni.getFileSystemManager().readFile({filePath:path,success:result => typeof result.data === 'string' ? reject() : resolve(result.data),fail:reject}),signal)
  checkAbort(signal); checkSize(data.byteLength,maximum)
  return {bytes:new Uint8Array(data),size:data.byteLength}
}
async function nativeVideo(path: string, maximum: number, options: VideoPreparationOptions): Promise<PreparedUploadVideo> {
  if (!/^(wxfile:|file:|https?:\/\/(tmp|usr)\/|\/(?!\/)|_doc\/)/.test(path)) throw failed()
  const source = await nativeBytes(path,maximum,options.signal), original = inspectMp4Video(source.bytes)
  if (original?.compatible) return {path,size:source.size,dispose(){}}
  // Native APIs cannot report arbitrary container/audio codecs. Only normalize a readable
  // single-video ISO container so we can verify that no audio track disappeared.
  if (!original || original.videoTracks !== 1 || typeof uni.compressVideo !== 'function') throw new VideoPreparationError('VIDEO_CONVERSION_UNAVAILABLE')
  let result = ''
  try {
    result = await pending<string>((resolve,reject) => uni.compressVideo({src:path,quality:'high',success:value=>resolve(value.tempFilePath),fail:reject}),options.signal,value=>releaseVideoCopy(value,path))
    checkAbort(options.signal)
    if (!result) throw failed()
    const output = await nativeBytes(result,maximum,options.signal), converted = inspectMp4Video(output.bytes)
    if (!converted?.compatible || converted.audioTracks !== original.audioTracks) throw new VideoPreparationError('VIDEO_CONVERSION_UNAVAILABLE')
    let disposed=false
    return {path:result,size:output.size,dispose(){if(!disposed)releaseVideoCopy(result,path);disposed=true}}
  } catch (error) { releaseVideoCopy(result,path); throw error }
}
// #endif

export async function prepareUploadVideo(path: string, maximum: number, options: VideoPreparationOptions = {}): Promise<PreparedUploadVideo> {
  if (!Number.isSafeInteger(maximum) || maximum < 32) throw failed()
  checkAbort(options.signal); options.onStage?.('preparing')
  // #ifdef H5
  return browserVideo(path,maximum,options)
  // #endif
  // #ifndef H5
  return nativeVideo(path,maximum,options)
  // #endif
}
