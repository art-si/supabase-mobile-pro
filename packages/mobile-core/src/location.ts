import { wgs84ToGcj02 } from './coordinates'

export interface LocationCoordinates {
  longitude: number
  latitude: number
  accuracyM?: number
}

export class LocationPermissionError extends Error {
  constructor() {
    super('定位权限未开启，请在小程序设置中允许位置信息')
  }
}

export function toGcj02Location(coords: { longitude: number; latitude: number; accuracy: number }): LocationCoordinates {
  const [longitude, latitude] = wgs84ToGcj02(coords.longitude, coords.latitude)
  return { longitude, latitude, accuracyM: coords.accuracy }
}

/** Inject the host's installed Capacitor plugin; other apps need no new dependency. */
export async function captureCapacitorGcj02(plugin: {
  checkPermissions(): Promise<{ location: string; coarseLocation: string }>
  requestPermissions(options: { permissions: ['location'] }): Promise<{ location: string; coarseLocation: string }>
  getCurrentPosition(options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number; enableLocationFallback: boolean }): Promise<{ coords: { longitude: number; latitude: number; accuracy: number } }>
}): Promise<LocationCoordinates> {
  let permission = await plugin.checkPermissions()
  const granted = () => permission.location === 'granted' || permission.coarseLocation === 'granted'
  if (!granted() && ['prompt', 'prompt-with-rationale'].includes(permission.location))
    permission = await plugin.requestPermissions({ permissions: ['location'] })
  if (!granted()) throw new Error('定位权限未开启，请在应用设置中允许访问位置后重试')
  const { coords } = await plugin.getCurrentPosition({
    enableHighAccuracy: permission.location === 'granted', timeout: 12000,
    maximumAge: 0, enableLocationFallback: true
  })
  if (![coords.longitude, coords.latitude, coords.accuracy].every(Number.isFinite)
    || Math.abs(coords.longitude) > 180 || Math.abs(coords.latitude) > 90 || coords.accuracy < 0)
    throw new Error('暂时无法获取位置，请开启系统定位后重试')
  return toGcj02Location(coords)
}

export function captureBrowserGcj02(): Promise<LocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('当前浏览器不支持定位，请使用手机系统浏览器打开'))
      return
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      reject(new Error('手机网页定位需要 HTTPS，请使用安全链接重新打开'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve(toGcj02Location(position.coords)),
      error => {
        const messages: Record<number, string> = {
          1: '定位权限未开启，请在浏览器设置中允许访问位置',
          2: '暂时无法获取位置，请开启手机定位服务后重试',
          3: '定位超时，请移至开阔区域后重试'
        }
        reject(new Error(messages[error.code] || '定位失败，请稍后重试'))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )
  })
}

export function captureNativeGcj02(): Promise<LocationCoordinates & { address: unknown }> {
  return new Promise((resolve, reject) => {
    const locate = () => uni.getLocation({
      type: 'gcj02',
      geocode: true,
      isHighAccuracy: true,
      highAccuracyExpireTime: 12000,
      success({ longitude, latitude, accuracy, address }) {
        resolve({ longitude, latitude, accuracyM: accuracy, address })
      },
      fail({ errMsg }) {
        reject(new Error(/auth deny|authorize|permission|denied/i.test(errMsg || '')
          ? '定位权限未开启，请在应用设置中允许访问位置后重试'
          : '暂时无法获取位置，请开启系统定位后重试'))
      }
    })

    // #ifdef MP-WEIXIN
    uni.authorize({
      scope: 'scope.userLocation',
      success: locate,
      fail: () => reject(new LocationPermissionError())
    })
    // #endif

    // #ifndef MP-WEIXIN
    locate()
    // #endif
  })
}
