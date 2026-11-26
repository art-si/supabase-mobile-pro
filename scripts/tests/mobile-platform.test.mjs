import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { resolveMobileProRoot } from '../consumer.mjs'
import { prepareMobileCore } from '../mobile-runtime.mjs'

function scratch(t) {
  const root = mkdtempSync(join(tmpdir(), 'mobile-pro-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return root
}
function runtime(path) {
  mkdirSync(join(path, 'scripts'), { recursive: true })
  writeFileSync(join(path, 'scripts/mobile-runtime.mjs'), '')
}

test('standalone always picks installed runtime; nested modules and explicit overrides still work', (t) => {
  const root = scratch(t)
  const previous = process.env.MOBILE_PRO_ROOT
  t.after(() => {
    if (previous === undefined) delete process.env.MOBILE_PRO_ROOT
    else process.env.MOBILE_PRO_ROOT = previous
  })
  delete process.env.MOBILE_PRO_ROOT
  const standalone = join(root, 'projects', 'app')
  const installed = join(standalone, 'node_modules/supabase-mobile-pro')
  runtime(root)
  runtime(installed)
  assert.equal(resolveMobileProRoot(standalone), installed)
  assert.equal(resolveMobileProRoot(join(root, 'modules/app')), root)
  process.env.MOBILE_PRO_ROOT = '../..'
  assert.equal(resolveMobileProRoot(standalone), root)
  process.env.MOBILE_PRO_ROOT = 'not-pro'
  assert.throws(() => resolveMobileProRoot(standalone), /MOBILE_PRO_ROOT/)
})

test('prepare refuses unowned data; synchronizes and removes stale generated files on repeated runs', (t) => {
  const root = scratch(t)
  const generated = join(root, 'src/_mobile-core')
  const original = join(generated, 'manual.txt')
  mkdirSync(generated, { recursive: true })
  writeFileSync(original, 'keep')
  assert.throws(() => prepareMobileCore(root), /不会覆盖|手动保存/)
  assert.equal(readFileSync(original, 'utf8'), 'keep')
  const marker = join(generated, '.mobile-pro-generated')
  writeFileSync(marker, 'wrong owner')
  assert.throws(() => prepareMobileCore(root), /不能确认生成目录归属/)
  assert.equal(readFileSync(original, 'utf8'), 'keep')
  rmSync(original)
  rmSync(marker)
  prepareMobileCore(root)
  const source = join(generated, 'latest-request.ts')
  const contents = readFileSync(source, 'utf8')
  assert.match(contents, /createLatestRequest/)
  writeFileSync(source, 'modified generated file')
  writeFileSync(join(generated, 'stale.txt'), 'stale')
  prepareMobileCore(root)
  assert.equal(readFileSync(source, 'utf8'), contents)
  assert.equal(existsSync(join(generated, 'stale.txt')), false)
  assert.ok(existsSync(join(root, 'src/static/fonts/NotoSansSC-OFL.txt')))
})

test('init creates a single pinned Pro dependency and never overwrites an existing project', (t) => {
  const root = scratch(t)
  const cli = resolve(import.meta.dirname, '../mobile-cli.mjs')
  const target = join(root, 'mobile-starter')
  const invoke = (source) => execFileSync(process.execPath, [cli, 'init', target, '--pro', source], { stdio: 'pipe' })
  assert.throws(() => invoke('latest'), /完整提交 SHA/)
  assert.equal(existsSync(target), false)
  const source = 'https://gitee.com/art-si/supabase-mobile-pro/repository/archive/3b61ba1c4cfc07baf8f3ed88fc1e42f6ed2b42aa.tar.gz'
  invoke(source)
  const manifest = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'))
  assert.deepEqual(manifest.dependencies, { 'supabase-mobile-pro': source })
  assert.match(readFileSync(join(target, 'src/pages/home/index.vue'), 'utf8'), /@mobile-core\/components\/MobileAction/)
  assert.ok(existsSync(join(target, 'src/pages.json')))
  assert.ok(!existsSync(join(target, 'src/_mobile-core')))
  assert.throws(() => invoke(source), /目录已存在/)
})
