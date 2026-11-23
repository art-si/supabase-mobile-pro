import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { inflateSync } from 'node:zlib'

function miniSource(source) {
  const enabled = [true]
  return source.split('\n').filter(line => {
    const directive = line.match(/^\s*\/\/ #(ifdef|ifndef|endif)(?:\s+(\S+))?/)
    if (!directive) return enabled.at(-1)
    if (directive[1] === 'endif') enabled.pop()
    else enabled.push(enabled.at(-1) && (directive[1] === 'ifdef' ? directive[2] === 'MP-WEIXIN' : directive[2] !== 'MP-WEIXIN'))
    return false
  }).join('\n')
}
function load(name, globals = {}) {
  const source = miniSource(readFileSync(new URL(`../packages/mobile-core/src/${name}.ts`, import.meta.url), 'utf8'))
  const names = [...source.matchAll(/export function (\w+)/g)].map(match => match[1])
  const code = stripTypeScriptTypes(source.replace(/^import .*$/gm, '').replace(/export /g, ''))
  const exports = {}
  runInNewContext(`${code}; Object.assign(exports, {${names.join(',')}})`, { exports, ...globals })
  return exports
}
const { encodeVideoFramePng } = load('video-frame-png')
const frame = (width = 2, height = 2) => ({ width, height, data: Uint8Array.from({ length: width * height * 4 }, (_, i) => i % 4 === 3 ? 255 : i % 256).buffer })

// Decode the generated PNG using Node's independent zlib decoder; validate chunks
// and CRC rather than merely checking a PNG signature or a mock canvas call.
function decodePng(bytes) {
  const input = Buffer.from(bytes), idat = []
  assert.deepEqual([...input.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  let width, height
  for (let offset = 8; offset < input.length;) {
    const length = input.readUInt32BE(offset), type = input.toString('ascii', offset + 4, offset + 8)
    let crc = 0xffffffff
    for (const value of input.subarray(offset + 4, offset + 8 + length)) {
      crc ^= value
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
    assert.equal((crc ^ 0xffffffff) >>> 0, input.readUInt32BE(offset + 8 + length), `valid ${type} CRC`)
    if (type === 'IHDR') { width = input.readUInt32BE(offset + 8); height = input.readUInt32BE(offset + 12); assert.equal(input[offset + 17], 6) }
    if (type === 'IDAT') idat.push(input.subarray(offset + 8, offset + 8 + length))
    offset += length + 12
  }
  const rows = inflateSync(Buffer.concat(idat)), pixels = []
  assert.equal(rows.length, height * (width * 4 + 1))
  for (let y = 0; y < height; y++) {
    const offset = y * (width * 4 + 1)
    assert.equal(rows[offset], 0)
    pixels.push(...rows.subarray(offset + 1, offset + 1 + width * 4))
  }
  return { width, height, pixels }
}

function harness({ size = 100, returnedFrame = frame(), missing = false, failed = false, empty = false } = {}) {
  const calls = [], downloads = [], removed = [], timers = new Map(), decoders = []
  let sequence = 0
  const wx = {
    arrayBufferToBase64: data => Buffer.from(data).toString('base64'),
    getFileSystemManager: () => ({ getFileInfo: options => options.success({ size }), unlink: options => removed.push(options.filePath) }),
    downloadFile(options) {
      const download = { options, abort: () => calls.push('abort'), onProgressUpdate(callback) { this.progress = callback }, onHeadersReceived(callback) { this.headers = callback } }
      downloads.push(download); return download
    },
    createVideoDecoder() {
      const decoder = {
        start: options => { calls.push(options); return failed ? Promise.reject(new Error('codec')) : Promise.resolve() },
        getFrameData: () => empty ? null : returnedFrame,
        stop: () => { calls.push('stop'); return Promise.resolve() },
        remove: () => { calls.push('remove'); return Promise.resolve() },
      }
      decoders.push(decoder); return decoder
    },
  }
  if (missing) delete wx.createVideoDecoder
  // Simulate WeChat's injected wx without a Web globalThis.wx or AbortController.
  const globals = { wx, globalThis: undefined, encodeVideoFramePng,
    setTimeout: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id },
    clearTimeout: id => timers.delete(id),
  }
  const { decodeWeixinVideoPoster } = load('video-poster-mini', globals)
  const api = load('video-poster', { ...globals, decodeWeixinVideoPoster })
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
  return { api, calls, downloads, removed, timers, decoders, settle,
    timeout: () => [...timers.values()].find(timer => timer.delay === 15000)?.callback(),
    complete: (index = 0, statusCode = 200) => downloads[index].options.success({ statusCode, tempFilePath: `wxfile://download-${index}.mp4` }),
  }
}

test('real PNG decode preserves RGBA, transparent pixels, top-to-bottom row direction and odd strides', () => {
  const input = { width: 3, height: 2, data: Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255]).buffer }
  const decoded = decodePng(encodeVideoFramePng(input))
  assert.equal(decoded.width, 3); assert.equal(decoded.height, 2)
  assert.deepEqual(decoded.pixels, [...new Uint8Array(input.data)])
})
test('landscape/portrait resizing keeps aspect and correct source pixel centres; two square frames stay below 1MB', () => {
  for (const input of [frame(768, 512), frame(512, 768), frame(512, 512)]) {
    const encoded = encodeVideoFramePng(input), decoded = decodePng(encoded)
    assert.equal(Math.max(decoded.width, decoded.height), 256)
    const source = new Uint8Array(input.data)
    for (const [x, y] of [[0, 0], [decoded.width - 1, 0], [0, decoded.height - 1], [decoded.width - 1, decoded.height - 1]]) {
      const from = (Math.floor((y + .5) * input.height / decoded.height) * input.width + Math.floor((x + .5) * input.width / decoded.width)) * 4
      assert.deepEqual(decoded.pixels.slice((y * decoded.width + x) * 4, (y * decoded.width + x) * 4 + 4), [...source.slice(from, from + 4)])
    }
    assert.ok(2 * (`data:image/png;base64,${Buffer.from(encoded).toString('base64')}`.length + 100) < 1024 * 1024)
  }
})
test('malformed dimensions, mismatched pixel layouts and overlarge native frames never become a cover', () => {
  for (const input of [{ ...frame(), width: 1.2 }, { ...frame(), width: 0 }, { ...frame(), data: new ArrayBuffer(3) }, { ...frame(), width: 8193 }, { width: 8192, height: 8192, data: new ArrayBuffer(0) }]) assert.equal(encodeVideoFramePng(input), null)
})
test('remote native video downloads, verifies actual size, decodes pixels, tears down and reuses account-scoped cover', async () => {
  const h = harness(), pending = h.api.captureVideoPoster('https://media.test/clip.mp4', { scope: 'a', cacheKey: 'clip' })
  assert.equal(h.downloads.length, 1); h.complete(); await h.settle()
  const poster = await pending
  assert.deepEqual(decodePng(Buffer.from(poster.split(',')[1], 'base64')).pixels, [...new Uint8Array(frame().data)])
  assert.equal(h.calls[0].source, 'wxfile://download-0.mp4'); assert.equal(h.calls[0].abortAudio, true)
  assert.deepEqual(h.removed, ['wxfile://download-0.mp4']); assert.ok(h.calls.includes('stop') && h.calls.includes('remove')); assert.equal(h.timers.size, 0)
  assert.equal(await h.api.captureVideoPoster('https://media.test/changed-signature.mp4', { scope: 'a', cacheKey: 'clip' }), poster)
  assert.equal(h.downloads.length, 1)
  h.api.clearVideoPosterScope('a')
  const next = h.api.captureVideoPoster('https://media.test/clip.mp4', { scope: 'a', cacheKey: 'clip' })
  assert.equal(h.downloads.length, 2); h.complete(1); await next
})
test('local chooseMedia paths are inspected without downloading or deleting their owner file', async () => {
  for (const path of ['wxfile://camera.mp4', 'http://tmp/camera.mp4']) {
    const h = harness(); assert.match(await h.api.captureVideoPoster(path), /^data:image\/png/)
    assert.equal(h.downloads.length, 0); assert.deepEqual(h.removed, [])
  }
})
test('20MiB limit rejects headers, streamed overruns and actual final size and cleans late native success', async () => {
  for (const kind of ['headers', 'written', 'expected', 'final']) {
    const h = harness({ size: kind === 'final' ? 20 * 1024 * 1024 + 1 : 100 })
    const pending = h.api.captureVideoPoster('https://media.test/large.mp4')
    if (kind === 'headers') h.downloads[0].headers({ header: { 'Content-Length': 20 * 1024 * 1024 + 1 } })
    else if (kind !== 'final') h.downloads[0].progress({ totalBytesWritten: kind === 'written' ? 20 * 1024 * 1024 + 1 : 1, totalBytesExpectedToWrite: kind === 'expected' ? 20 * 1024 * 1024 + 1 : 1 })
    h.complete(); assert.equal(await pending, ''); assert.deepEqual(h.removed, ['wxfile://download-0.mp4']); assert.equal(h.decoders.length, 0)
  }
})
test('independent abort preserves shared subscriber; last abort/hidden scope cancels download and cleans late result', async () => {
  const h = harness(), a = new AbortController(), b = new AbortController()
  const one = h.api.captureVideoPoster('https://media.test/shared.mp4', { scope: 'owner', signal: a.signal })
  const two = h.api.captureVideoPoster('https://media.test/shared.mp4', { scope: 'owner', signal: b.signal })
  a.abort(); assert.equal(await one, ''); assert.equal(h.calls.includes('abort'), false)
  b.abort(); assert.equal(await two, ''); assert.ok(h.calls.includes('abort')); h.complete(); assert.deepEqual(h.removed, ['wxfile://download-0.mp4'])
  const waiting = h.api.captureVideoPoster('https://media.test/hidden.mp4', { scope: 'owner' })
  h.api.clearVideoPosterScope('owner'); assert.equal(await waiting, ''); h.complete(1); assert.equal(h.removed.length, 2)
})
test('queue stays at two native downloads, timeout frees slot and scope cancellation clears remaining work', async () => {
  const h = harness(), waiting = [0, 1, 2, 3].map(i => h.api.captureVideoPoster(`https://media.test/${i}.mp4`, { scope: 'queue' }))
  assert.equal(h.downloads.length, 2); h.timeout(); await h.settle(); assert.equal(h.downloads.length, 3)
  h.api.clearVideoPosterScope('queue'); assert.deepEqual(await Promise.all(waiting), ['', '', '', '']); await h.settle(); assert.equal(h.timers.size, 0)
})
test('six warm cached covers are delivered in separate render flushes below the native bridge budget', async () => {
  const h = harness(), png = encodeVideoFramePng(frame(256, 256))
  const poster = `data:image/png;base64,${Buffer.from(png).toString('base64')}`
  for (let i = 0; i < 6; i++) h.api.rememberVideoPoster(poster, { scope: 'warm', cacheKey: String(i) })
  let batch = [], applied = 0
  const batches = [], flush = [], tasks = []
  const deliver = h.api.createVideoPosterDelivery(() => new Promise(resolve => {
    batches.push(batch); batch = []; flush.push(resolve)
  }), () => new Promise(resolve => tasks.push(resolve)))
  const jobs = [0, 1, 2, 3, 4, 5].map(i => h.api.captureVideoPoster(`https://media.test/${i}.mp4`, { scope: 'warm', cacheKey: String(i) })
    .then(value => deliver(() => { batch.push({ id: i, poster: value }); applied++ })))
  await h.settle(); assert.equal(applied, 1)
  for (let i = 0; i < 6; i++) {
    assert.equal(flush.length, i + 1); flush[i](); await h.settle()
    assert.equal(applied, i + 1, 'nextTick alone cannot deliver another poster before a native macrotask')
    tasks[i](); await h.settle()
  }
  await Promise.all(jobs)
  assert.equal(h.downloads.length, 0); assert.equal(batches.length, 6)
  assert.ok(batches.every(batch => batch.length === 1 && Buffer.byteLength(JSON.stringify(batch)) < 1024 * 1024))
})
test('hidden or changed-scope gallery drops queued poster delivery before assignment or render', async () => {
  const h = harness(), flushes = [], rendered = []
  let version = 1, visible = true
  const deliver = h.api.createVideoPosterDelivery(() => new Promise(resolve => flushes.push(resolve)), () => Promise.resolve())
  const receive = (id, owner) => deliver(() => rendered.push(id), () => version === owner && visible)
  const first = receive('first', 1), old = receive('old', 1)
  await h.settle(); assert.deepEqual(rendered, ['first'])
  visible = false; version++; flushes[0](); await Promise.all([first, old]); assert.deepEqual(rendered, ['first'])
  visible = true
  const latest = receive('latest', 2), changed = receive('changed', 2)
  await h.settle(); version++; flushes[1](); await Promise.all([latest, changed])
  assert.deepEqual(rendered, ['first', 'latest']); assert.equal(flushes.length, 2)
})
test('missing API, codec rejection, invalid pixels, failed HTTP and stalled frame return no invented cover', async () => {
  for (const options of [{ missing: true }, { failed: true }, { returnedFrame: { ...frame(), data: new ArrayBuffer(3) } }, { empty: true }, {}]) {
    const h = harness(options), pending = h.api.captureVideoPoster('https://media.test/failure.mp4')
    if (h.downloads.length) h.complete(0, Object.keys(options).length ? 200 : 404)
    await h.settle(); if (options.empty) h.timeout()
    assert.equal(await pending, ''); assert.equal(h.timers.size, 0)
    if (h.downloads.length) assert.deepEqual(h.removed, ['wxfile://download-0.mp4'])
  }
})
