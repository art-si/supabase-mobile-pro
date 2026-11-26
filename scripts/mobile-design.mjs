import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function describeMobileDesign(platformRoot) {
  const directory = resolve(platformRoot, '.agents/skills/mobile-platform')
  const sources = JSON.parse(readFileSync(resolve(directory, 'sources.json'), 'utf8'))
  return [
    resolve(directory, 'SKILL.md'),
    '',
    ...Object.entries(sources).map(
      ([name, { repo, ref, entry }]) => `${name}: https://github.com/${repo}/blob/${ref}/${entry}`
    )
  ].join('\n')
}
