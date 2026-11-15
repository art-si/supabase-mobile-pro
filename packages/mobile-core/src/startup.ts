import { onLaunch, onShow } from '@dcloudio/uni-app'

interface StartupSession {
  token: string
  ensureValidSession(): Promise<boolean>
}

interface StartupDictionary {
  load(token: string): Promise<void>
}

export function useStartupData(
  getSession: () => StartupSession,
  getDictionary: () => StartupDictionary
) {
  let pending: Promise<void> | null = null

  function loadStartupData() {
    if (pending) return

    pending = (async () => {
      const session = getSession()
      if (await session.ensureValidSession()) await getDictionary().load(session.token)
    })()
      .catch((error) => {
        console.warn('startup data loading failed', error)
      })
      .finally(() => {
        pending = null
      })
  }

  onLaunch(loadStartupData)
  onShow(loadStartupData)
}
