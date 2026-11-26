import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { installedMobileProRoot } from './consumer.mjs'

const sourceDirectory = resolve(import.meta.dirname, '../packages/mobile-core/src')
const fontLicense = resolve(sourceDirectory, '../assets/fonts/NotoSansSC-OFL.txt')
const iconLicense = resolve(sourceDirectory, '../assets/fonts/BootstrapIcons-MIT.txt')
const generatedMarker = '.mobile-pro-generated'
const markerText = 'Generated from supabase-mobile-pro/packages/mobile-core/src.'

function ensureLocalDirectory(path) {
  mkdirSync(path, { recursive: true })
  if (!lstatSync(path).isDirectory()) throw new Error(`不是应用内普通目录：${path}`)
}

function writeIfChanged(from, to) {
  const stat = lstatSync(to, { throwIfNoEntry: false })
  if (stat && (!stat.isFile() || stat.nlink > 1)) throw new Error(`不会覆盖非普通文件：${to}`)
  const contents = readFileSync(from)
  if (!existsSync(to) || !contents.equals(readFileSync(to))) writeFileSync(to, contents)
}

function syncDirectory(source, target) {
  mkdirSync(target, { recursive: true })
  const entries = readdirSync(source, { withFileTypes: true })
  const expected = new Map(entries.map((entry) => [entry.name, entry]))

  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === generatedMarker) continue
    // Only descend into checked directories created for build output. Unlink symlinks.
    const original = expected.get(entry.name)
    if (!original || original.isDirectory() !== entry.isDirectory() || entry.isSymbolicLink()) {
      rmSync(join(target, entry.name), { force: true, recursive: entry.isDirectory() })
    }
  }

  for (const entry of entries) {
    const from = join(source, entry.name)
    const to = join(target, entry.name)
    if (entry.isDirectory()) {
      syncDirectory(from, to)
    } else {
      writeIfChanged(from, to)
    }
  }
}

export function prepareMobileCore(applicationRoot) {
  const appSource = join(realpathSync(applicationRoot), 'src')
  if (!lstatSync(appSource).isDirectory()) {
    throw new Error(`${appSource} 必须是项目中的目录。`)
  }
  const directory = join(appSource, '_mobile-core')
  ensureLocalDirectory(directory)
  const marker = join(directory, generatedMarker)
  const mark = lstatSync(marker, { throwIfNoEntry: false })
  if (mark) {
    if (!mark.isFile() || readFileSync(marker, 'utf8').trim() !== markerText) {
      throw new Error(`不能确认生成目录归属，不会覆盖：${directory}`)
    }
  } else {
    if (readdirSync(directory).length > 0) {
      throw new Error(`${directory} 已存在手动保存的文件。请先移走这些文件再构建。`)
    }
    writeFileSync(marker, markerText + '\n', { flag: 'wx' })
  }
  const staticRoot = join(appSource, 'static')
  const staticFonts = join(staticRoot, 'fonts')
  ensureLocalDirectory(staticRoot)
  ensureLocalDirectory(staticFonts)
  syncDirectory(sourceDirectory, directory)
  writeIfChanged(fontLicense, join(staticFonts, 'NotoSansSC-OFL.txt'))
  writeIfChanged(iconLicense, join(staticFonts, 'BootstrapIcons-MIT.txt'))
  return directory
}

function createUniPlugins(applicationRoot, uniPlugin) {
  if (uniPlugin) return (uniPlugin.default ?? uniPlugin)()
  const platformRoot = installedMobileProRoot(applicationRoot)
  const require = createRequire(resolve(platformRoot, 'package.json'))
  const plugin = require('@dcloudio/vite-plugin-uni')
  const previousContext = process.env.UNI_CLI_CONTEXT
  // Register Uni's platform plugins from Pro. Subsequent build hooks use the application's context.
  process.env.UNI_CLI_CONTEXT = platformRoot
  try {
    return (plugin.default ?? plugin)()
  } finally {
    if (previousContext === undefined) delete process.env.UNI_CLI_CONTEXT
    else process.env.UNI_CLI_CONTEXT = previousContext
  }
}

export function createMobileViteConfig(applicationRoot, uniPlugin) {
  const mobileCore = prepareMobileCore(applicationRoot)
  const h5 = process.env.UNI_PLATFORM === 'h5'
  const alias = { '@mobile-core': mobileCore }
  if (!uniPlugin) {
    const require = createRequire(resolve(installedMobileProRoot(applicationRoot), 'package.json'))
    // Uni preserves symlink paths. Resolve Pinia at its package root so its own dependencies remain reachable.
    alias.pinia = dirname(require.resolve('pinia/package.json'))
  }
  return {
    base: h5 ? './' : '/',
    resolve: { alias },
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: ['import', 'global-builtin']
        }
      }
    },
    build: { rolldownOptions: { checks: { pluginTimings: false } } },
    plugins: [
      createUniPlugins(applicationRoot, uniPlugin),
      h5 && {
        name: 'mobile-pro-h5-boot',
        transformIndexHtml(html) {
          const marker = '<!-- mobile-boot -->'
          if (!html.includes(marker)) return

          const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]
          if (!title?.trim()) throw new Error('H5 启动页需要在 index.html 中设置页面标题。')
          const markup = readFileSync(join(sourceDirectory, 'h5-boot.html'), 'utf8').trim()
          const styles = readFileSync(join(sourceDirectory, 'styles/h5-boot.css'), 'utf8')
          return {
            html: html.replace(marker, () => markup.replace('{{title}}', () => title)),
            tags: [{ tag: 'style', children: styles, injectTo: 'head' }]
          }
        }
      },
      {
        name: 'h5-nojekyll',
        apply: 'build',
        writeBundle({ dir }) {
          if (h5 && dir) writeFileSync(join(dir, '.nojekyll'), '')
        }
      }
    ]
  }
}
