/** Encode the decoder's tightly packed RGBA frame without a DOM/native canvas.
 * PNG uses lossless stored DEFLATE blocks; a 256px edge keeps two simultaneous
 * data URIs below the Mini Program bridge limit even for square frames.
 */
export function encodeVideoFramePng(frame: { width: number; height: number; data: ArrayBuffer }): Uint8Array | null {
  const { width, height, data } = frame
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
      width > 8192 || height > 8192 || width * height > 16 * 1024 * 1024 ||
      !data || data.byteLength !== width * height * 4) return null
  const scale = Math.min(1, 256 / Math.max(width, height))
  const outWidth = Math.max(1, Math.round(width * scale)), outHeight = Math.max(1, Math.round(height * scale))
  const source = new Uint8Array(data), stride = outWidth * 4 + 1
  const rows = new Uint8Array(stride * outHeight)
  // Row zero is the top of the decoder frame. Sample pixel centres and retain RGBA.
  for (let y = 0; y < outHeight; y++) {
    const sourceY = Math.min(height - 1, Math.floor((y + .5) * height / outHeight))
    for (let x = 0; x < outWidth; x++) {
      const sourceX = Math.min(width - 1, Math.floor((x + .5) * width / outWidth))
      const from = (sourceY * width + sourceX) * 4, to = y * stride + 1 + x * 4
      rows[to] = source[from]; rows[to + 1] = source[from + 1]
      rows[to + 2] = source[from + 2]; rows[to + 3] = source[from + 3]
    }
  }
  const blocks = Math.ceil(rows.length / 65535), deflate = new Uint8Array(rows.length + blocks * 5 + 6)
  deflate.set([0x78, 0x01]) // zlib, no preset dictionary, fastest compression level.
  let offset = 2, a = 1, b = 0
  for (let start = 0; start < rows.length; start += 65535) {
    const length = Math.min(65535, rows.length - start)
    deflate[offset++] = start + length === rows.length ? 1 : 0 // BFINAL + stored block.
    deflate[offset++] = length & 255; deflate[offset++] = length >>> 8
    deflate[offset++] = (~length) & 255; deflate[offset++] = (~length >>> 8) & 255
    deflate.set(rows.subarray(start, start + length), offset); offset += length
    for (let i = start; i < start + length; i++) { a = (a + rows[i]) % 65521; b = (b + a) % 65521 }
  }
  new DataView(deflate.buffer).setUint32(offset, ((b << 16) | a) >>> 0)
  const header = new Uint8Array(13), view = new DataView(header.buffer)
  view.setUint32(0, outWidth); view.setUint32(4, outHeight)
  header.set([8, 6, 0, 0, 0], 8) // 8-bit RGBA, standard compression/filter, no interlacing.
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflate), chunk('IEND', new Uint8Array())]
  const png = new Uint8Array(parts.reduce((size, part) => size + part.length, 0))
  offset = 0
  for (const part of parts) { png.set(part, offset); offset += part.length }
  return png
}

function chunk(type: string, data: Uint8Array) {
  const output = new Uint8Array(data.length + 12), view = new DataView(output.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) output[4 + i] = type.charCodeAt(i)
  output.set(data, 8)
  let crc = 0xffffffff
  for (let i = 4; i < output.length - 4; i++) {
    crc ^= output[i]
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  view.setUint32(output.length - 4, (crc ^ 0xffffffff) >>> 0)
  return output
}
