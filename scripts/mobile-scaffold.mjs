import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

export function scaffoldMobileApp(platformRoot, target, source) {
  if (!target || !source) throw new Error('用法：mobile-pro init <新目录> --pro <固定包地址或 file: 路径>')
  const directory = resolve(target)
  const name = basename(directory)
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) throw new Error('项目目录名仅可用小写字母、数字和连字符。')
  const isArchive = /^https:\/\/[^\s?#]+\/(?:[a-f0-9]{40}\.tar\.gz|[a-f0-9]{40})(?:\.tar\.gz)?$/i.test(source)
  const isLocalTar = /^file:.+\.tgz$/i.test(source)
  if (!isArchive && !isLocalTar) throw new Error('请使用固定到完整提交 SHA 的 HTTPS 源码包，或本地 file:*.tgz。不要使用分支或 latest。')
  const input = join(platformRoot, 'templates/starter')
  const platform = JSON.parse(readFileSync(join(platformRoot, 'package.json'), 'utf8'))
  // Refuse an existing directory before copying any files.
  if (existsSync(directory)) throw new Error(`目录已存在，不会覆盖：${directory}`)
  mkdirSync(directory)
  for (const entry of readdirSync(input)) {
    cpSync(join(input, entry), join(directory, entry), { recursive: true, force: false, errorOnExist: true })
  }
  writeFileSync(join(directory, '.gitignore'), 'node_modules/\ndist/\nsrc/_mobile-core/\nsrc/static/fonts/\n.env.local\n.env.*.local\n')
  writeFileSync(join(directory, 'package.json'), JSON.stringify({
    name,
    private: true,
    type: 'module',
    packageManager: platform.packageManager,
    engines: platform.engines,
    scripts: {
      'dev:h5': 'mobile-pro uni -p h5',
      'typecheck': 'mobile-pro typecheck --noEmit --pretty false',
      'build:h5': 'mobile-pro uni build -p h5',
      'build:mp-weixin': 'mobile-pro uni build -p mp-weixin'
    },
    dependencies: { 'supabase-mobile-pro': source }
  }, null, 2) + '\n')
  return directory
}
