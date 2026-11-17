import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const remoteMaster = 'refs/remotes/origin/master'

function git(cwd, args, { capture = false, allowMissing = false } = {}) {
  const { error, status, stdout } = spawnSync('git', ['-c', 'submodule.recurse=false', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit'
  })
  if (error) throw error
  if (allowMissing && status === 1) return null
  if (status !== 0) throw new Error(`git ${args.join(' ')} 失败（退出码 ${status ?? 1}）。`)
  return stdout ?? ''
}

function readGit(cwd, args, allowMissing = false) {
  return git(cwd, args, { capture: true, allowMissing })
}

function pullModule(parent, path, recordedCommit) {
  const cwd = resolve(parent, path)
  if (!existsSync(resolve(cwd, '.git'))) {
    git(parent, ['submodule', 'update', '--init', '--checkout', '--', path])
  }

  const head = readGit(cwd, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'], true)?.trim()
  const index = readGit(cwd, ['rev-parse', '--path-format=absolute', '--git-path', 'index']).trim()
  // An interrupted checkout can leave just a .git pointer and no index.
  const emptyCheckout = !existsSync(index) && readdirSync(cwd).every((entry) => entry === '.git')
  if (!head && !emptyCheckout) throw new Error('无法读取 HEAD，请先检查子仓的本地文件和 Git 状态。')
  if (head && emptyCheckout) git(cwd, ['restore', '--source=HEAD', '--staged', '--worktree', '--', ':/'])

  git(cwd, ['fetch', '--no-recurse-submodules', 'origin', `+refs/heads/master:${remoteMaster}`])
  const latest = readGit(cwd, ['rev-parse', remoteMaster]).trim()
  const branch = head && readGit(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD'], true)?.trim()
  const localMaster = readGit(cwd, ['rev-parse', '--verify', '--quiet', 'refs/heads/master'], true)?.trim()

  if (localMaster && readGit(cwd, ['merge-base', '--is-ancestor', localMaster, latest], true) === null) {
    throw new Error('本地 master 含有远端没有的提交，请先处理后重试。')
  }
  if (head && !branch && head !== recordedCommit && !readGit(cwd, [
    'for-each-ref', '--count=1', `--contains=${head}`, 'refs/heads', 'refs/remotes', 'refs/tags'
  ]).trim()) {
    throw new Error('当前分离的 HEAD 包含未被分支或标签保留的提交，请先创建分支。')
  }

  if (branch !== 'master' || head !== latest) {
    const changes = readGit(cwd, ['status', '--porcelain', '--untracked-files=normal', '--ignore-submodules=all'])
    if (changes) throw new Error('子仓存在未提交的文件变更，请处理后重试。')
    if (!localMaster) {
      git(cwd, ['switch', '--no-overwrite-ignore', '--track', '-c', 'master', remoteMaster])
    } else {
      if (branch !== 'master') git(cwd, ['switch', '--no-overwrite-ignore', 'master'])
      git(cwd, ['merge', '--ff-only', '--no-autostash', '--no-overwrite-ignore', remoteMaster])
    }
  }

  const upstream = readGit(cwd, ['for-each-ref', '--format=%(upstream)', 'refs/heads/master']).trim()
  if (upstream !== remoteMaster) git(cwd, ['branch', '--set-upstream-to=origin/master', 'master'])
}

const failures = []

function pullSubmodules(parent, prefix = '') {
  if (!existsSync(resolve(parent, '.gitmodules'))) return
  const gitlinks = readGit(parent, ['ls-files', '--stage', '-z']).split('\0')
  if (!gitlinks.some((entry) => entry.startsWith('160000 '))) return

  git(parent, ['submodule', 'sync'])
  for (const entry of gitlinks) {
    if (!entry.startsWith('160000 ')) continue
    const tab = entry.indexOf('\t')
    const [, commit, stage] = entry.slice(0, tab).split(' ')
    if (stage !== '0') continue
    const path = entry.slice(tab + 1)
    const label = `${prefix}${path}`
    console.log(`\n[modules:pull] 更新 ${label}`)
    try {
      pullModule(parent, path, commit)
      pullSubmodules(resolve(parent, path), `${label}/`)
    } catch (error) {
      failures.push(label)
      console.error(`[modules:pull] ${label}：${error.message}`)
    }
  }
}

try {
  console.log('[modules:pull] 快进主仓当前分支。')
  git(root, ['pull', '--ff-only', '--no-rebase', '--no-autostash', '--no-recurse-submodules'])
  pullSubmodules(root)
  if (failures.length) throw new Error(`以下子仓未能更新：${failures.join('、')}`)
  console.log('\n[modules:pull] 主仓和子仓已更新。运行 pnpm modules:status 查看子仓版本。')
} catch (error) {
  console.error(`\n[modules:pull] ${error.message}`)
  process.exitCode = 1
}
