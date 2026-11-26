import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'

const platform = resolve(import.meta.dirname, '../..')
const files = [
  'scripts/mobile-cli.mjs',
  'scripts/consumer.mjs',
  'scripts/mobile-design.mjs',
  '.agents/skills/mobile-platform/SKILL.md',
  '.agents/skills/mobile-platform/sources.json'
]

test('design uses the CLI package, not a different workspace runtime', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mobile-pro-design-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'scripts'))
  writeFileSync(join(root, 'scripts/mobile-runtime.mjs'), '// An older Pro checkout.')
  const app = join(root, 'modules', 'consumer')
  const installed = join(app, 'node_modules', 'supabase-mobile-pro')
  for (const path of files) {
    const target = join(installed, path)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(join(platform, path), target)
  }
  const args = [join(installed, 'scripts/mobile-cli.mjs'), 'design']
  for (const override of ['', root]) {
    const output = execFileSync(process.execPath, args, {
      cwd: app,
      env: { ...process.env, MOBILE_PRO_ROOT: override },
      encoding: 'utf8'
    })
    assert.equal(output.split(/\r?\n/)[0], join(installed, '.agents/skills/mobile-platform/SKILL.md'))
    assert.match(output, /apple-design: https:\/\/github\.com\//)
    assert.match(output, /ui-ux-pro-max: https:\/\/github\.com\//)
    assert.match(output, /ponytail: https:\/\/github\.com\//)
  }
})
