import type { UploadSignal } from './upload-progress'

/** Local-only upload preparation. Server validation/privacy processing is still required. */
export class ImagePreparationError extends Error {
  constructor(
    readonly code:
      | 'IMAGE_INPUT_TOO_LARGE'
      | 'IMAGE_DIMENSIONS_TOO_LARGE'
      | 'IMAGE_UNSUPPORTED'
      | 'IMAGE_PREPARATION_FAILED'
  ) {
    super(code)
  }
}

export interface UploadImageLimits {
  maxBytes: number
  maxPixels: number
  maxEdge: number
}
/** Optional host decoder, loaded only by applications that need extra local image formats. */
export type UploadImageNormalizer = (source: Blob, limits: UploadImageLimits, options?: { signal?: UploadSignal }) => Promise<Blob>
export interface ImagePreparationOptions { normalizeUnsupportedImage?: UploadImageNormalizer; signal?: UploadSignal }
export interface PreparedUploadImage {
  path: string
  width: number
  height: number
  /** Releases only our generated copy, never the selected source or the camera original. */
  dispose: () => void
}

const fail = () => new ImagePreparationError('IMAGE_PREPARATION_FAILED')
const cancelled = () => Object.assign(new Error('UPLOAD_CANCELLED'), { code: 'UPLOAD_CANCELLED' })
const assertActive = (signal?: UploadSignal) => { if (signal?.aborted) throw cancelled() }
const isCancelled = (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'UPLOAD_CANCELLED')
const preparationTimeout = 20000

export function uploadImageSize(width: number, height: number, limits: UploadImageLimits) {
  if (
    ![limits.maxBytes, limits.maxPixels, limits.maxEdge].every(
      (v) => Number.isSafeInteger(v) && v > 0
    )
  )
    throw fail()
  if (![width, height].every((v) => Number.isSafeInteger(v) && v > 0)) throw fail()
  if (width * height > limits.maxPixels || Math.max(width, height) > 32768)
    throw new ImagePreparationError('IMAGE_DIMENSIONS_TOO_LARGE')
  const ratio = Math.min(1, limits.maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  }
}

function checkBytes(size: number, limits: UploadImageLimits) {
  if (!Number.isSafeInteger(size) || size < 16) throw fail()
  if (size > limits.maxBytes) throw new ImagePreparationError('IMAGE_INPUT_TOO_LARGE')
}

export type UploadImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'avif'

function isoImageDimensions(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4))
  let boxes = 0, avif = false, width = 0, height = 0, dimensions = 0
  const walk = (start: number, end: number, depth: number, container = '') => {
    if (depth > 5) throw fail()
    for (let offset = start; offset < end;) {
      if (++boxes > 512 || offset + 8 > end) throw fail()
      let size = view.getUint32(offset), header = 8
      const kind = tag(offset + 4)
      if (size === 1) {
        if (offset + 16 > end || view.getUint32(offset + 8) !== 0) throw fail()
        size = view.getUint32(offset + 12); header = 16
      } else if (size === 0) size = end - offset
      if (size < header || offset + size > end) throw fail()
      const body = offset + header, limit = offset + size
      if (kind === 'ftyp' && depth === 0) {
        if (limit - body < 8 || (limit - body) % 4) throw fail()
        const brands = [tag(body)]
        for (let at = body + 8; at + 4 <= limit; at += 4) brands.push(tag(at))
        avif ||= brands.some(brand => brand === 'avif' || brand === 'avis')
        if (!avif) throw new ImagePreparationError('IMAGE_UNSUPPORTED')
      }
      if (kind === 'meta' && depth === 0) {
        if (body + 4 > limit || view.getUint32(body) !== 0) throw fail()
        walk(body + 4, limit, depth + 1, kind)
      } else if ((kind === 'iprp' && container === 'meta') || (kind === 'ipco' && container === 'iprp')) walk(body, limit, depth + 1, kind)
      else if (kind === 'ispe' && container === 'ipco') {
        if (limit - body !== 12 || view.getUint32(body) !== 0 || ++dimensions > 64) throw fail()
        const w = view.getUint32(body + 4), h = view.getUint32(body + 8)
        if (!w || !h) throw fail()
        // Conservatively bound every item/alpha/tile property, never trust the first thumbnail.
        width = Math.max(width, w); height = Math.max(height, h)
      }
      offset = limit
    }
  }
  walk(0, bytes.length, 0)
  if (!avif) throw new ImagePreparationError('IMAGE_UNSUPPORTED')
  if (!dimensions) throw fail()
  return { width, height, format: 'avif' as const }
}
/** Read dimensions before browser decoding/allocation; do not trust an extension or MIME label. */
export function uploadImageMetadata(bytes: Uint8Array): {
  width: number
  height: number
  format: UploadImageFormat
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) {
    if (view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452) throw fail()
    return { width: view.getUint32(16), height: view.getUint32(20), format: 'png' }
  }
  const ascii = (offset: number, value: string) => [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0))
  if (bytes.length >= 16 && ascii(4, 'ftyp')) return isoImageDimensions(bytes)
  if (ascii(0, 'GIF87a') || ascii(0, 'GIF89a')) {
    if (bytes.length < 13) throw fail()
    return { width: view.getUint16(6, true), height: view.getUint16(8, true), format: 'gif' }
  }
  if (ascii(0, 'BM')) {
    if (bytes.length < 26) throw fail()
    const dib = view.getUint32(14, true)
    if (dib === 12) return { width: view.getUint16(18, true), height: view.getUint16(20, true), format: 'bmp' }
    if (![40, 52, 56, 108, 124].includes(dib) || bytes.length < 14 + dib) throw fail()
    return { width: view.getInt32(18, true), height: Math.abs(view.getInt32(22, true)), format: 'bmp' }
  }
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) {
    if (bytes.length < 20) throw fail()
    const end = view.getUint32(4, true) + 8
    if (end > bytes.length || end < 20) throw fail()
    for (let offset = 12; offset + 8 <= end;) {
      const length = view.getUint32(offset + 4, true), start = offset + 8
      if (start + length > end) throw fail()
      if (ascii(offset, 'VP8X')) {
        if (length < 10) throw fail()
        const u24 = (index: number) => bytes[index]! + bytes[index + 1]! * 256 + bytes[index + 2]! * 65536
        return { width: u24(start + 4) + 1, height: u24(start + 7) + 1, format: 'webp' }
      }
      if (ascii(offset, 'VP8L')) {
        if (length < 5 || bytes[start] !== 0x2f) throw fail()
        const bits = view.getUint32(start + 1, true)
        return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, format: 'webp' }
      }
      if (ascii(offset, 'VP8 ')) {
        if (length < 10 || bytes[start]! & 1 || bytes[start + 3] !== 0x9d || bytes[start + 4] !== 0x01 || bytes[start + 5] !== 0x2a) throw fail()
        return { width: view.getUint16(start + 6, true) & 0x3fff, height: view.getUint16(start + 8, true) & 0x3fff, format: 'webp' }
      }
      offset = start + length + (length & 1)
    }
    throw fail()
  }
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
    throw new ImagePreparationError('IMAGE_UNSUPPORTED')
  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 255) throw fail()
    while (bytes[offset] === 255) offset++
    const marker = bytes[offset++]
    if (marker === undefined) throw fail()
    if (marker === 217 || marker === 218) break
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue
    if (offset + 2 > bytes.length) break
    const length = view.getUint16(offset)
    if (length < 2 || offset + length > bytes.length) throw fail()
    if ([192, 193, 194].includes(marker)) {
      if (length < 8) throw fail()
      return {
        width: view.getUint16(offset + 5),
        height: view.getUint16(offset + 3),
        format: 'jpeg'
      }
    }
    offset += length
  }
  throw fail()
}

/** Kept compatible for existing cropper/header consumers. */
export function uploadImageHeader(bytes: Uint8Array): { width: number; height: number } {
  const { width, height } = uploadImageMetadata(bytes)
  return { width, height }
}

function operation<T>(
  start: (resolve: (value: T) => void, reject: (error?: unknown) => void) => void,
  signal?: UploadSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false
    const done = (value?: T, error?: unknown) => {
      if (settled) return
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort)
      if (error) reject(error); else resolve(value as T)
    }
    const abort = () => done(undefined, cancelled())
    const timer = setTimeout(() => done(undefined, fail()), preparationTimeout)
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) { abort(); return }
    try {
      start(value => done(value), error => done(undefined, error instanceof Error ? error : fail()))
    } catch {
      done(undefined, fail())
    }
  })
}

// #ifdef H5
function firstImageFrame(source: Blob, signal?: UploadSignal): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') return Promise.reject(new ImagePreparationError('IMAGE_UNSUPPORTED'))
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (error: unknown) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(error) }
    const abort = () => finish(cancelled())
    const timer = setTimeout(() => finish(fail()), preparationTimeout)
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) { abort(); return }
    // The HTML standard defines the default/first animation frame for a Blob source.
    try {
      void createImageBitmap(source).then(bitmap => {
        if (settled) { bitmap.close(); return }
        settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); resolve(bitmap)
      }, () => finish(new ImagePreparationError('IMAGE_UNSUPPORTED')))
    } catch { finish(new ImagePreparationError('IMAGE_UNSUPPORTED')) }
  })
}
async function prepareBrowserImage(
  path: string,
  limits: UploadImageLimits,
  options: ImagePreparationOptions
): Promise<PreparedUploadImage> {
  // uni.chooseImage's H5 result is a blob URL. Never fetch a remote photo here.
  if (!path.startsWith('blob:')) throw fail()
  assertActive(options.signal)
  const controller = new AbortController()
  const abortFetch = () => controller.abort()
  options.signal?.addEventListener('abort', abortFetch, { once: true })
  const timeout = setTimeout(() => controller.abort(), preparationTimeout)
  let source: Blob
  try {
    const response = await fetch(path, { signal: controller.signal })
    if (!response.ok) throw fail()
    source = await response.blob()
  } catch {
    assertActive(options.signal)
    throw fail()
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFetch)
  }
  assertActive(options.signal)
  checkBytes(source.size, limits)
  let header: ReturnType<typeof uploadImageMetadata>, normalized = false
  try { header = uploadImageMetadata(new Uint8Array(await source.arrayBuffer())) }
  catch (error) {
    if (!(error instanceof ImagePreparationError) || error.code !== 'IMAGE_UNSUPPORTED' || !options.normalizeUnsupportedImage) throw error
    const normalizer = options.normalizeUnsupportedImage
    source = await operation<Blob>((resolve, reject) => { void normalizer(source, limits, { signal: options.signal }).then(resolve, reject) }, options.signal)
    assertActive(options.signal)
    checkBytes(source.size, limits)
    header = uploadImageMetadata(new Uint8Array(await source.arrayBuffer()))
    if (!['jpeg', 'png'].includes(header.format)) throw new ImagePreparationError('IMAGE_UNSUPPORTED')
    normalized = true
  }
  assertActive(options.signal)
  uploadImageSize(header.width, header.height, limits)
  const image = new Image()
  const canvas = document.createElement('canvas')
  let bitmap: ImageBitmap | undefined
  const normalizedPath = normalized ? URL.createObjectURL(source) : ''
  try {
    const normalize = !['jpeg', 'png'].includes(header.format)
    if (normalize) bitmap = await firstImageFrame(source, options.signal)
    else await operation<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = reject
        image.src = normalizedPath || path
      }, options.signal)
    assertActive(options.signal)
    // Modern browser image dimensions/drawImage include EXIF orientation. Do not rotate twice.
    const width = bitmap?.width ?? image.naturalWidth, height = bitmap?.height ?? image.naturalHeight
    const size = uploadImageSize(width, height, limits)
    if (!normalized && !normalize && size.width === width && size.height === height)
      return { path, ...size, dispose() {} }
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw fail()
    context.fillStyle = '#fff'
    context.fillRect(0, 0, size.width, size.height)
    context.drawImage(bitmap || image, 0, 0, size.width, size.height)
    const copy = await operation<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject()), 'image/jpeg', 0.85), options.signal
    )
    checkBytes(copy.size, limits)
    const encoded = uploadImageMetadata(new Uint8Array(await copy.arrayBuffer()))
    assertActive(options.signal)
    if (encoded.format !== 'jpeg' || encoded.width !== size.width || encoded.height !== size.height) throw fail()
    const output = URL.createObjectURL(copy)
    let disposed = false
    return {
      path: output,
      ...size,
      dispose() {
        if (!disposed) URL.revokeObjectURL(output)
        disposed = true
      }
    }
  } catch (error) {
    throw error instanceof ImagePreparationError || isCancelled(error) ? error : fail()
  } finally {
    image.onload = image.onerror = null
    image.removeAttribute('src')
    canvas.width = canvas.height = 0
    bitmap?.close()
    if (normalizedPath) URL.revokeObjectURL(normalizedPath)
  }
}
// #endif

// #ifndef H5
function releaseCopy(path: string, original: string) {
  if (!path || path === original) return
  try {
    uni.getFileSystemManager().unlink({ filePath: path, fail() {} })
  } catch {
    /* The platform also expires temporary files; never delete the source. */
  }
}

async function imageInfo(path: string, limits: UploadImageLimits, source = false, signal?: UploadSignal) {
  const file = await operation<UniApp.GetFileInfoSuccess>((resolve, reject) =>
    uni.getFileInfo({ filePath: path, success: resolve, fail: reject }), signal
  )
  checkBytes(file.size, limits)
  const info = await operation<UniApp.GetImageInfoSuccessData>((resolve, reject) =>
    uni.getImageInfo({ src: path, success: resolve, fail: reject }), signal
  )
  if (!(source ? ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'heic', 'heif'] : ['jpg', 'jpeg', 'png']).includes(String(info.type).toLowerCase()))
    throw new ImagePreparationError('IMAGE_UNSUPPORTED')
  uploadImageSize(info.width, info.height, limits)
  return info
}

async function prepareMiniImage(
  path: string,
  limits: UploadImageLimits,
  signal?: UploadSignal
): Promise<PreparedUploadImage> {
  // Only platform-selected local paths, not an external image download.
  if (!/^(wxfile:|file:|https?:\/\/(tmp|usr)\/|\/(?!\/)|_doc\/)/.test(path)) throw fail()
  const info = await imageInfo(path, limits, true, signal)
  assertActive(signal)
  const size = uploadImageSize(info.width, info.height, limits)
  const normalize = !['jpg', 'jpeg', 'png'].includes(String(info.type).toLowerCase())
  if (!normalize && size.width === info.width && size.height === info.height)
    return { path, ...size, dispose() {} }
  let output = ''
  try {
    output = await new Promise<string>((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => {
        settled = true
        signal?.removeEventListener('abort', abort)
        reject(fail())
      }, preparationTimeout)
      const abort = () => {
        if (settled) return
        settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(cancelled())
      }
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) { abort(); return }
      const failed = () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          signal?.removeEventListener('abort', abort)
          reject(fail())
        }
      }
      try {
        uni.compressImage({
          src: path,
          quality: 85,
          // One axis lets the platform retain the photo's aspect ratio.
          ...(info.width >= info.height
            ? { compressedWidth: size.width }
            : { compressedHeight: size.height }),
          success(result) {
            if (settled) {
              releaseCopy(result.tempFilePath, path)
              return
            }
            settled = true
            clearTimeout(timer)
            signal?.removeEventListener('abort', abort)
            resolve(result.tempFilePath)
          },
          fail: failed
        })
      } catch {
        failed()
      }
    })
    const prepared = await imageInfo(output, limits, false, signal)
    assertActive(signal)
    if (Math.max(prepared.width, prepared.height) > limits.maxEdge) throw fail()
    let disposed = false
    return {
      path: output,
      width: prepared.width,
      height: prepared.height,
      dispose() {
        if (!disposed) releaseCopy(output, path)
        disposed = true
      }
    }
  } catch (error) {
    releaseCopy(output, path)
    throw error instanceof ImagePreparationError || isCancelled(error) ? error : fail()
  }
}
// #endif

export async function prepareUploadImage(
  path: string,
  limits: UploadImageLimits,
  options: ImagePreparationOptions = {}
): Promise<PreparedUploadImage> {
  uploadImageSize(1, 1, limits)
  assertActive(options.signal)
  // #ifdef H5
  if (typeof document !== 'undefined') return prepareBrowserImage(path, limits, options)
  // #endif
  // #ifndef H5
  return prepareMiniImage(path, limits, options.signal)
  // #endif
  throw fail()
}
