import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const temp = mkdtempSync(join(tmpdir(), 'mobile-pro-packed-'))
const packOnly = process.argv.includes('--pack-only')
const env = { ...process.env }
delete env.MOBILE_PRO_ROOT

function run(command, args, cwd = temp, capture = false) {
  return execFileSync(command, args, {
    cwd, env, stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8',
    shell: process.platform === 'win32' && ['npm', 'pnpm'].includes(command)
  })
}

try {
  // npm invokes no package lifecycle hooks. Test the shipped file list, not a linked source tree.
  const [packed] = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination',
    process.platform === 'win32' ? `"${temp}"` : temp], root, true))
  const archive = packed.filename
  const unpack = join(temp, 'unpacked')
  mkdirSync(unpack)
  run('tar', ['-xf', join(temp, archive), '-C', unpack])
  const pkg = join(unpack, 'package')
  const expected = [
    '.agents/skills/mobile-platform/SKILL.md', '.agents/skills/mobile-platform/sources.json',
    '.agents/references/apple-mobile-visual.md', 'docs/mobile-consumer.md',
    'scripts/mobile-runtime.mjs', 'scripts/mobile-scaffold.mjs', 'templates/starter/src/pages/home/index.vue',
    'packages/mobile-core/src/latest-request.ts', 'packages/mobile-core/assets/fonts/NotoSansSC-OFL.txt'
  ]
  for (const file of expected) assert.ok(existsSync(join(pkg, file)), `缺少包内文件：${file}`)
  const cli = join(pkg, 'scripts/mobile-cli.mjs')
  const app = join(temp, 'standalone-app')
  run(process.execPath, [cli, 'init', app, '--pro', `file:../${archive}`])
  const design = run(process.execPath, [cli, 'design'], app, true)
  assert.equal(design.split(/\r?\n/)[0], join(pkg, '.agents/skills/mobile-platform/SKILL.md'))
  // Read and run inside the unpacked artifact, not the repository.
  const { prepareMobileCore: preparePacked } = await import(pathToFileURL(join(pkg, 'scripts/mobile-runtime.mjs')).href)
  const core = preparePacked(app)
  assert.ok(existsSync(join(core, 'h5-boot.html')))
  assert.ok(!existsSync(join(core, '.agents')))
  if (!packOnly) {
    run('pnpm', ['install', '--no-frozen-lockfile'], app)
    run('pnpm', ['install', '--frozen-lockfile'], app)
    run('pnpm', ['exec', 'mobile-pro', 'design'], app)
    for (const script of ['typecheck', 'build:h5', 'build:mp-weixin']) run('pnpm', ['run', script], app)
    for (const artifact of ['dist/build/h5/index.html', 'dist/build/h5/.nojekyll', 'dist/build/mp-weixin/app.json']) {
      assert.ok(existsSync(join(app, artifact)), artifact)
    }
    assert.match(readFileSync(join(app, 'dist/build/mp-weixin/app.json'), 'utf8'), /pages\/home\/index/)
  }
  console.log(packOnly ? 'Pro pack, CLI, starter and generated runtime passed.' : 'Standalone Pro package built for H5 and WeChat.')
} finally {
  rmSync(temp, { recursive: true, force: true })
}
