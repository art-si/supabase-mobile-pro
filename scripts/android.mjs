import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { baseNativePlugins } from './native-plugins.mjs'

const root = resolve(import.meta.dirname, '..')
const applications = {
  driver: {
    module: 'supabase-mobile-tms-driver',
    appId: 'com.artsi.tms.driver.debug',
    appName: 'TMS 司机端',
    locationAndCamera: true
  },
  shipper: {
    module: 'supabase-mobile-tms-shipper',
    appId: 'com.artsi.tms.shipper.debug',
    appName: 'TMS 货主端',
    locationAndCamera: false
  }
}
const windows = process.platform === 'win32'
const [operation, requested, ...extra] = process.argv.slice(2)

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

function run(command, args, cwd, env = process.env, windowsVerbatimArguments = false) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', windowsVerbatimArguments })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`命令执行失败：${command} ${args.join(' ')}`)
}

function buildEnvironment() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || (
    windows && process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') :
      process.platform === 'darwin' ? join(homedir(), 'Library', 'Android', 'sdk') : join(homedir(), 'Android', 'Sdk')
  )
  if (!existsSync(join(sdk, 'platforms', 'android-36', 'android.jar'))) {
    throw new Error('未找到 Android SDK 36。安装 Android SDK Platform 36 和 Build-Tools 35.0.0，并设置 ANDROID_HOME。')
  }
  return { ...process.env, ANDROID_HOME: sdk }
}

function buildDebug(platform, env) {
  const gradle = env.GRADLE_HOME
    ? resolve(env.GRADLE_HOME, 'bin', windows ? 'gradle.bat' : 'gradle')
    : join(platform, windows ? 'gradlew.bat' : 'gradlew')
  if (env.GRADLE_HOME && !existsSync(gradle)) throw new Error('GRADLE_HOME 没有指向有效的 Gradle 安装目录。')
  if (windows) {
    run(env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', '""%MOBILE_PRO_GRADLE%" :app:assembleDebug"'], platform, {
      ...env,
      MOBILE_PRO_GRADLE: gradle
    }, true)
  } else {
    run(gradle, [':app:assembleDebug'], platform, env)
  }
}

function configureProject(platform, app, version) {
  const nativeApp = join(platform, 'app')
  const main = join(nativeApp, 'src', 'main')
  const resources = join(main, 'res')
  const shared = join(import.meta.dirname, 'android')
  const manifestPath = join(main, 'AndroidManifest.xml')
  const manifest = readFileSync(join(shared, 'AndroidManifest.xml'), 'utf8')
  const permissions = app.locationAndCamera ? `    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <queries>
        <intent><action android:name="android.media.action.IMAGE_CAPTURE" /></intent>
    </queries>` : ''
  writeFileSync(manifestPath, manifest.replace('    <!-- App permissions -->', permissions))
  copyFileSync(join(shared, 'file_paths.xml'), join(resources, 'xml', 'file_paths.xml'))
  copyFileSync(join(shared, 'tms_launcher.xml'), join(resources, 'drawable', 'tms_launcher.xml'))
  copyFileSync(join(shared, 'styles.xml'), join(resources, 'values', 'styles.xml'))

  const gradlePath = join(nativeApp, 'build.gradle')
  const gradle = readFileSync(gradlePath, 'utf8')
  const assetPattern = /\bignoreAssetsPattern\s*=\s*'[^'\n]*'/
  if (!/\bversionCode\s+\d+/.test(gradle) || !/\bversionName\s+"[^"\n]+"/.test(gradle) || !assetPattern.test(gradle)) {
    throw new Error('Capacitor 生成的 Gradle 文件缺少应用版本或资源过滤配置。')
  }
  // Preserve dot-prefixed web chunks and omit only known repository metadata.
  const ignoredAssets = '!.svn:!.git:!.ds_store:!.nojekyll:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
  writeFileSync(gradlePath, gradle
    .replace(/\bversionCode\s+\d+/, `versionCode ${version.code}`)
    .replace(/\bversionName\s+"[^"\n]+"/, `versionName "${version.name}"`)
    .replace(assetPattern, `ignoreAssetsPattern = '${ignoredAssets}'`))

  const wrapperPath = join(platform, 'gradle', 'wrapper', 'gradle-wrapper.properties')
  const wrapper = readFileSync(wrapperPath, 'utf8')
  // The binary distribution has everything needed to assemble the debug APK.
  const distribution = wrapper.replace(/^(distributionUrl=.*)-all\.zip$/m, '$1-bin.zip')
  if (wrapper !== distribution) writeFileSync(wrapperPath, distribution)
}

function appVersion(application) {
  const { versionName: name, versionCode } = readJson(join(application, 'src', 'manifest.json'))
  const code = Number(versionCode)
  if (typeof name !== 'string' || !/^[\w.-]+$/.test(name) || !Number.isInteger(code) || code <= 0 || code > 2_100_000_000) {
    throw new Error('src/manifest.json 需要有效的 versionName 和 versionCode。')
  }
  return { name, code }
}

function prepare(name, pnpm) {
  const app = applications[name]
  const application = join(root, 'modules', app.module)
  const packagePath = join(application, 'package.json')
  if (!existsSync(packagePath)) throw new Error(`${app.module} 尚未初始化，请先运行 pnpm modules:init。`)

  const project = join(application, 'dist', 'mobile-pro-android')
  const platform = join(project, 'android')
  const webDir = 'web'
  const version = appVersion(application)
  const includePlugins = app.locationAndCamera
    ? [...baseNativePlugins, '@capacitor/geolocation']
    : baseNativePlugins
  let cli
  try {
    const require = createRequire(packagePath)
    const cliPath = require.resolve('@capacitor/cli/package.json')
    require.resolve('@capacitor/android/package.json')
    cli = join(dirname(cliPath), readJson(cliPath).bin.cap)
  } catch {
    throw new Error(`Android 依赖尚未安装。请运行 pnpm modules:install ${name}。`)
  }

  mkdirSync(project, { recursive: true })
  writeJson(join(project, 'package.json'), { private: true, name: `${app.module}-android` })
  writeJson(join(project, 'capacitor.config.json'), {
    appId: app.appId,
    appName: app.appName,
    webDir,
    includePlugins,
    server: { androidScheme: 'https' },
    plugins: { SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover' } }
  })
  run(process.execPath, [pnpm, 'run', 'build:h5'], application, {
    ...process.env,
    MOBILE_PRO_ROOT: root,
    UNI_OUTPUT_DIR: join(project, webDir)
  })

  if (existsSync(join(platform, 'gradle', 'wrapper', 'gradle-wrapper.properties'))) {
    run(process.execPath, [cli, 'sync', 'android'], project)
  } else {
    run(process.execPath, [cli, 'add', 'android'], project)
  }
  configureProject(platform, app, version)
  return { platform, version }
}

function main() {
  if (!['sync', 'build'].includes(operation) || extra.length || (requested && !Object.hasOwn(applications, requested))) {
    throw new Error('请运行 pnpm android:sync 或 pnpm build:android，可选应用为 driver 或 shipper。')
  }
  const pnpm = process.env.npm_execpath
  if (!pnpm) throw new Error('请从主仓通过 pnpm 运行此命令。')
  const env = operation === 'build' ? buildEnvironment() : undefined
  for (const name of requested ? [requested] : Object.keys(applications)) {
    const { platform, version } = prepare(name, pnpm)
    console.log(`[${name}] Android 工程：${platform}`)
    if (!env) continue

    buildDebug(platform, env)
    const outputDirectory = join(root, 'artifacts', 'android', name)
    mkdirSync(outputDirectory, { recursive: true })
    const apk = join(outputDirectory, `tms-${name}-${version.name}-debug.apk`)
    copyFileSync(join(platform, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), apk)
    console.log(`[${name}] 调试 APK：${apk}`)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
