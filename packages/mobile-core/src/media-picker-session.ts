type OwnedSelection = { release?: () => void }
type PageOwner = { page: unknown; route: string }
type Selection = PageOwner & { hidden: boolean; resumed: boolean }
let selection: Selection | undefined
let returned: PageOwner | undefined

function currentPage(): PageOwner | undefined {
  if (typeof getCurrentPages !== 'function') return
  const pages = getCurrentPages(), page = pages[pages.length - 1]
  return page ? { page, route: page.route || '' } : undefined
}
function samePage(owner: PageOwner) {
  const current = currentPage()
  return Boolean(current && current.page === owner.page && current.route === owner.route)
}
/** Only a pending native chooser on this exact page may preserve Page.onHide. */
export function preserveMediaPickerPage(): boolean {
  if (!selection || !samePage(selection)) return false
  selection.hidden = true
  return true
}
/** Consume the native return once, irrespective of callback/Page.onShow order. */
export function resumeMediaPickerPage(): boolean {
  if (selection && samePage(selection)) { selection.resumed = true; return true }
  const previous = returned
  returned = undefined
  return Boolean(previous && samePage(previous))
}
/** Own native UI by page instance and route, while caller scope still guards accounts. */
export async function withMediaPickerPage<T extends OwnedSelection>(load: () => Promise<T[]>): Promise<T[]> {
  const owner = currentPage()
  // Standalone/non-page adapters can still select; they do not gain a hide exemption.
  if (!owner) return load()
  if (selection && samePage(selection)) throw Object.assign(new Error('MEDIA_SELECTION_IN_PROGRESS'), { code: 'MEDIA_SELECTION_IN_PROGRESS' })
  const request: Selection = { ...owner, hidden: false, resumed: false }
  selection = request; returned = undefined
  const hide = () => { if (selection === request && samePage(request)) request.hidden = true }
  try {
    if (typeof uni.onAppHide === 'function') uni.onAppHide(hide)
    const files = await load()
    if (selection !== request || !samePage(owner)) { files.forEach(file => file.release?.()); return [] }
    return files
  } finally {
    if (typeof uni.offAppHide === 'function') uni.offAppHide(hide)
    if (selection === request) {
      if (request.hidden && !request.resumed && samePage(request)) returned = request
      selection = undefined
    }
  }
}
