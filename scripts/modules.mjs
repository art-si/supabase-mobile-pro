import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const applications = new Map([
  ['driver', 'supabase-mobile-tms-driver'],
  ['shipper', 'supabase-mobile-tms-shipper'],
  ['smis', 'supabase-mobile-smis']
])

const [command, application, ...args] = process.argv.slice(2)
const pnpm = process.env.npm_execpath
if (!pnpm) throw new Error('请从主仓通过 pnpm 运行此命令。')
if ((command.startsWith('dev:') && !application) || (application && !applications.has(application))) {
  throw new Error('请指定 driver、shipper 或 smis 应用。')
}

// Uni CLI parses repeated --outDir flags as an array. Use its environment
// override so each app can retain the default destination in its build script.
const outputIndex = args.findIndex((arg) => arg === '--outDir' || arg.startsWith('--outDir='))
let outputDirectory
if (outputIndex >= 0 && command.startsWith('build')) {
  if (command === 'build') throw new Error('自定义产物目录时，请单独执行 H5 或微信小程序构建。')
  const option = args[outputIndex]
  outputDirectory = option === '--outDir' ? args[outputIndex + 1] : option.slice('--outDir='.length)
  if (!outputDirectory || outputDirectory.startsWith('--')) throw new Error('请为 --outDir 指定目录。')
  args.splice(outputIndex, option === '--outDir' ? 2 : 1)
}

const selected = application ? [applications.get(application)] : applications.values()
for (const name of selected) {
  const cwd = resolve(root, 'modules', name)
  if (!existsSync(resolve(cwd, 'package.json'))) {
    throw new Error(`${name} 尚未初始化，请运行 pnpm modules:init。`)
  }

  const commands =
    command === 'install'
      ? [['install', '--frozen-lockfile', ...args]]
      : command === 'build'
        ? [['run', 'build:h5', ...args], ['run', 'build:mp-weixin', ...args]]
        : [['run', command, ...args]]

  for (const argv of commands) {
    console.log(`[${name}] pnpm ${argv.join(' ')}`)
    const { error, status } = spawnSync(process.execPath, [pnpm, ...argv], {
      cwd,
      env: {
        ...process.env,
        MOBILE_PRO_ROOT: root,
        ...(outputDirectory && { UNI_OUTPUT_DIR: resolve(cwd, outputDirectory) })
      },
      stdio: 'inherit'
    })
    if (error) throw error
    if (status !== 0) process.exit(status ?? 1)
  }
}
