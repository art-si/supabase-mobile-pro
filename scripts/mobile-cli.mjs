#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { installedMobileProRoot, loadMobilePro } from './consumer.mjs'

const applicationRoot = process.cwd()
const [command, ...args] = process.argv.slice(2)

if (command === 'design') {
  // Resolve the design guide from the package that supplied this CLI, not a workspace runtime override.
  const { describeMobileDesign } = await import('./mobile-design.mjs')
  console.log(describeMobileDesign(resolve(import.meta.dirname, '..')))
} else if (command === 'prepare' || command === 'typecheck') {
  const { prepareMobileCore } = await loadMobilePro(applicationRoot)
  prepareMobileCore(applicationRoot)
}

const tools = {
  cap: ['@capacitor/cli', 'cap'],
  uni: ['@dcloudio/vite-plugin-uni', 'uni'],
  vite: ['vite', 'vite'],
  typecheck: ['vue-tsc', 'vue-tsc']
}

if (command !== 'prepare' && command !== 'design') {
  if (!Object.hasOwn(tools, command)) {
    throw new Error('用法：mobile-pro <design|prepare|uni|vite|typecheck|cap> [参数]')
  }
  const [name, bin] = tools[command]
  const require = createRequire(resolve(installedMobileProRoot(applicationRoot), 'package.json'))
  const manifestFile = require.resolve(`${name}/package.json`)
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
  const entry = resolve(dirname(manifestFile), manifest.bin[bin])
  process.argv = [process.execPath, entry, ...args]
  await import(pathToFileURL(entry).href)
}
