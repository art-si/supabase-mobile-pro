import { isAndroidApp } from './platform'

interface AndroidBackPlugin {
  addListener(event: 'backButton', listener: () => Promise<void>): Promise<unknown>
  exitApp(): Promise<void>
}

function dismissDialog() {
  const modal = document.querySelector<HTMLElement>('#u-a-m uni-modal')
  if (modal?.getClientRects().length) {
    // Use the modal's own action so its callback settles (for example, a draft guard).
    const action = modal.querySelector<HTMLElement>('.uni-modal__btn_default') ??
      modal.querySelector<HTMLElement>('.uni-modal__btn_primary')
    action?.click()
    return true
  }

  let topOverlay: HTMLElement | undefined
  let highestZ = -Infinity
  for (const overlay of document.querySelectorAll<HTMLElement>('.wd-popup-wrapper > .wd-overlay')) {
    if (!overlay.getClientRects().length) continue
    const z = Number(getComputedStyle(overlay).zIndex) || 0
    if (z < highestZ) continue
    topOverlay = overlay
    highestZ = z
  }
  // Wot's overlay respects each sheet's close-on-click-modal and submission guards.
  topOverlay?.click()
  return Boolean(topOverlay)
}

function dismissPreview() {
  const viewer = document.querySelector('dialog.mobile-image-viewer[open]')
  if (viewer) {
    viewer.dispatchEvent(new Event('cancel', { cancelable: true }))
    return Promise.resolve(true)
  }
  return new Promise<boolean>(resolve => uni.closePreviewImage({
    success: () => resolve(true),
    fail: () => resolve(false)
  }))
}

/** Handle the Capacitor back event on the apps' Uni-app H5 runtime. */
export function createAndroidBackHandler(exitApp: () => Promise<void>) {
  let lastRootBack = 0
  let handling = false

  return async () => {
    if (handling) return
    handling = true
    try {
      if (await dismissPreview() || dismissDialog()) {
        lastRootBack = 0
        return
      }
      if (getCurrentPages().length > 1) {
        lastRootBack = 0
        // Using Uni-app's stack invokes the page's onBackPress hook before navigating.
        await new Promise<void>(resolve => uni.navigateBack({ complete: () => resolve() }))
        return
      }
      const now = Date.now()
      if (lastRootBack && now - lastRootBack < 2000) {
        lastRootBack = 0
        await exitApp()
      } else {
        lastRootBack = now
        uni.showToast({ title: '再按一次退出应用', icon: 'none', duration: 1800 })
      }
    } finally {
      handling = false
    }
  }
}

export function registerAndroidBackHandler(app: AndroidBackPlugin) {
  if (!isAndroidApp()) return
  const back = createAndroidBackHandler(() => app.exitApp())
  void app.addListener('backButton', back).catch(error => console.error('Android back button:', error))
}
