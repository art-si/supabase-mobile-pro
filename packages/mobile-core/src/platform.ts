export function isAndroidApp(): boolean {
  // #ifdef H5
  if (typeof window !== 'undefined') {
    const runtime = window as Window & { Capacitor?: { getPlatform?: () => string } }
    return runtime.Capacitor?.getPlatform?.() === 'android'
  }
  // #endif
  return false
}
