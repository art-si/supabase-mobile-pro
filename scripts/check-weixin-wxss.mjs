import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const usage = 'Usage: node scripts/check-weixin-wxss.mjs [--compiler <path to wcsc>] <mini-program output> [...]\n' +
  'Set WEIXIN_WXSS_COMPILER instead of --compiler to reuse the installed compiler path.'
const args = process.argv.slice(2)
if (args[0] === '--help') {
  console.log(usage)
  process.exit(0)
}

const compiler = args[0] === '--compiler' ? args.splice(0, 2)[1] : process.env.WEIXIN_WXSS_COMPILER
if (!compiler || !args.length) {
  console.error(usage)
  process.exit(1)
}
const executable = resolve(compiler)

function check(output) {
  const project = resolve(output)
  const app = JSON.parse(readFileSync(resolve(project, 'app.json'), 'utf8'))
  const routes = [
    ...app.pages,
    ...(app.subPackages ?? app.subpackages ?? []).flatMap(({ root, pages }) => pages.map(page => `${root}/${page}`))
  ]
  const styles = readdirSync(project, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.wxss'))
    .map(entry => relative(project, resolve(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .sort()
  if (!styles.includes('app.wxss')) throw new Error('The build output has no app.wxss.')

  const pageStyles = [...new Set(routes.map(route => `${route}.wxss`))].filter(route => styles.includes(route))
  const components = styles.filter(style => style !== 'app.wxss' && !pageStyles.includes(style))
  // wcsc expects the app stylesheet before the counted page files, then component and imported styles.
  const result = spawnSync(executable, ['-lc', '-pc', String(pageStyles.length), 'app.wxss', ...pageStyles, ...components], {
    cwd: project,
    stdio: ['ignore', 'ignore', 'inherit'],
    windowsHide: true
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`wcsc failed (${result.signal || `exit ${result.status}`}).`)
  console.log(`PASS ${output}: ${pageStyles.length} page styles, ${styles.length} WXSS files`)
}

try {
  if (!statSync(executable).isFile()) throw new Error('The compiler path is not a file.')
  for (const output of args) {
    try {
      check(output)
    } catch (error) {
      console.error(`FAIL ${output}: ${error.message}`)
      process.exitCode = 1
    }
  }
} catch (error) {
  console.error(`Cannot use compiler ${executable}: ${error.message}`)
  process.exitCode = 1
}
