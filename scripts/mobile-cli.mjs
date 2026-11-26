#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { installedMobileProRoot, loadMobilePro } from './consumer.mjs'

const applicationRoot = process.cwd()
const [command, ...args] = process.argv.slice(2)

const platformRoot = resolve(import.meta.dirname, '..')
if (command === 'design') {
  const { describeMobileDesign } = await import('./mobile-design.mjs')
  console.log(describeMobileDesign(platformRoot))
} else if (command === 'init') {
  const [target, option, source] = args
  if (args.length !== 3 || option !== '--pro') {
    throw new Error('用法：mobile-pro init <新目录> --pro <固定包地址或 file: 路径>')
  }
  const { scaffoldMobileApp } = await import('./mobile-scaffold.mjs')
  console.log(scaffoldMobileApp(platformRoot, target, source))
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

if (!['design', 'init', 'prepare'].includes(command)) {
  if (!Object.hasOwn(tools, command)) {
    throw new Error('用法：mobile-pro <design|init|prepare|uni|vite|typecheck|cap> [参数]')
  }
  const [name, bin] = tools[command]
  const require = createRequire(resolve(installedMobileProRoot(applicationRoot), 'package.json'))
  const manifestFile = require.resolve(`${name}/package.json`)
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
  const entry = resolve(dirname(manifestFile), manifest.bin[bin])
  process.argv = [process.execPath, entry, ...args]
  await import(pathToFileURL(entry).href)
}
