import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const sourceDirectory = resolve(import.meta.dirname, '../packages/mobile-core/src')
const fontLicense = resolve(sourceDirectory, '../assets/fonts/NotoSansSC-OFL.txt')
const generatedMarker = '.mobile-pro-generated'

function writeIfChanged(from, to) {
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
  mkdirSync(directory, { recursive: true })
  if (!lstatSync(directory).isDirectory()) {
    throw new Error(`${directory} 必须是项目中的目录。`)
  }
  const marker = join(directory, generatedMarker)
  if (!existsSync(marker)) {
    if (readdirSync(directory).length > 0) {
      throw new Error(`${directory} 已存在手动保存的文件。请先移走这些文件再构建。`)
    }
    writeFileSync(marker, 'Generated from supabase-mobile-pro/packages/mobile-core/src.\n')
  }
  syncDirectory(sourceDirectory, directory)
  const staticFonts = join(appSource, 'static', 'fonts')
  mkdirSync(staticFonts, { recursive: true })
  writeIfChanged(fontLicense, join(staticFonts, 'NotoSansSC-OFL.txt'))
  return directory
}

export function createMobileViteConfig(applicationRoot, uniPlugin) {
  const mobileCore = prepareMobileCore(applicationRoot)
  const uni = uniPlugin.default ?? uniPlugin
  const h5 = process.env.UNI_PLATFORM === 'h5'
  return {
    base: h5 ? './' : '/',
    resolve: { alias: { '@mobile-core': mobileCore } },
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
      uni(),
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
