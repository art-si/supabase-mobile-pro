export interface ConversationPart {
  text: string
  emphasis?: 'strong' | 'code'
}

export type ConversationLine = {
  kind: 'paragraph' | 'heading' | 'item' | 'quote' | 'code'
  marker?: string
  parts: ConversationPart[]
}

export function formatConversationText(content: string): ConversationLine[] {
  const blocks: ConversationLine[] = []
  let code: string[] | undefined
  const inline = (text: string): ConversationPart[] =>
    text.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`)/g).filter(Boolean).map(part => {
      // The delimiters are consumed here; every part still renders as plain text.
      if (/^(\*\*[^*]+\*\*|__[^_]+__)$/.test(part)) return { text: part.slice(2, -2), emphasis: 'strong' }
      if (/^`[^`]+`$/.test(part)) return { text: part.slice(1, -1), emphasis: 'code' }
      return { text: part }
    })
  const flushCode = () => {
    if (code?.length) blocks.push({ kind: 'code', parts: [{ text: code.join('\n') }] })
    code = undefined
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.startsWith('```')) {
      if (code) flushCode()
      else code = []
      continue
    }
    if (code) { code.push(rawLine); continue }
    if (!line) continue
    const heading = line.match(/^#{1,6}\s+(.+)$/)
    const item = line.match(/^(\d+[.、)]|[-*+•])\s+(.+)$/)
    const quote = line.match(/^>\s*(.+)$/)
    if (heading?.[1]) blocks.push({ kind: 'heading', parts: inline(heading[1]) })
    else if (item?.[1] && item[2]) blocks.push({ kind: 'item', marker: /^\d/.test(item[1]) ? item[1] : '•', parts: inline(item[2]) })
    else if (quote?.[1]) blocks.push({ kind: 'quote', parts: inline(quote[1]) })
    else blocks.push({ kind: 'paragraph', parts: inline(line) })
  }
  flushCode()
  return blocks
}
