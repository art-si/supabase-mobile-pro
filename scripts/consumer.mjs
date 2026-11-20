import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function installedMobileProRoot(applicationRoot) {
  return resolve(applicationRoot, 'node_modules/supabase-mobile-pro')
}

export function resolveMobileProRoot(applicationRoot) {
  const configured = process.env.MOBILE_PRO_ROOT
  const candidates = configured
    ? [resolve(applicationRoot, configured)]
    : [resolve(applicationRoot, '../..'), installedMobileProRoot(applicationRoot)]
  const platform = candidates.find((directory) =>
    existsSync(resolve(directory, 'scripts/mobile-runtime.mjs'))
  )
  if (!platform) {
    throw new Error(
      configured
        ? 'MOBILE_PRO_ROOT 未指向有效的 supabase-mobile-pro 主仓。'
        : '未找到 supabase-mobile-pro，请先运行 pnpm install。'
    )
  }
  return platform
}

export function loadMobilePro(applicationRoot) {
  const entry = resolve(resolveMobileProRoot(applicationRoot), 'scripts/mobile-runtime.mjs')
  return import(pathToFileURL(entry).href)
}
