/** Great-circle distance in metres. Both points must use the same coordinate system. */
export function distanceMeters(from: readonly [number, number], to: readonly [number, number]): number | undefined {
  if (![...from, ...to].every(Number.isFinite) || Math.abs(from[0]) > 180 || Math.abs(to[0]) > 180 || Math.abs(from[1]) > 90 || Math.abs(to[1]) > 90) return undefined
  const rad = Math.PI / 180
  const a = Math.sin((to[1] - from[1]) * rad / 2) ** 2 + Math.cos(from[1] * rad) * Math.cos(to[1] * rad) * Math.sin((to[0] - from[0]) * rad / 2) ** 2
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
}

export function wgs84ToGcj02(longitude: number, latitude: number): [number, number] {
  if (longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271) {
    return [longitude, latitude]
  }
  const axis = 6378245
  const eccentricity = 0.006693421622965943
  const radians = (latitude / 180) * Math.PI
  const magic = 1 - eccentricity * Math.sin(radians) ** 2
  const sqrtMagic = Math.sqrt(magic)
  const latitudeOffset = (transformLatitude(longitude - 105, latitude - 35) * 180) /
    (((axis * (1 - eccentricity)) / (magic * sqrtMagic)) * Math.PI)
  const longitudeOffset = (transformLongitude(longitude - 105, latitude - 35) * 180) /
    ((axis / sqrtMagic) * Math.cos(radians) * Math.PI)
  return [longitude + longitudeOffset, latitude + latitudeOffset]
}

function transformLatitude(longitude: number, latitude: number) {
  let value = -100 + 2 * longitude + 3 * latitude + 0.2 * latitude ** 2 + 0.1 * longitude * latitude + 0.2 * Math.sqrt(Math.abs(longitude))
  value += ((20 * Math.sin(6 * longitude * Math.PI) + 20 * Math.sin(2 * longitude * Math.PI)) * 2) / 3
  value += ((20 * Math.sin(latitude * Math.PI) + 40 * Math.sin((latitude / 3) * Math.PI)) * 2) / 3
  value += ((160 * Math.sin((latitude / 12) * Math.PI) + 320 * Math.sin((latitude * Math.PI) / 30)) * 2) / 3
  return value
}

function transformLongitude(longitude: number, latitude: number) {
  let value = 300 + longitude + 2 * latitude + 0.1 * longitude ** 2 + 0.1 * longitude * latitude + 0.1 * Math.sqrt(Math.abs(longitude))
  value += ((20 * Math.sin(6 * longitude * Math.PI) + 20 * Math.sin(2 * longitude * Math.PI)) * 2) / 3
  value += ((20 * Math.sin(longitude * Math.PI) + 40 * Math.sin((longitude / 3) * Math.PI)) * 2) / 3
  value += ((150 * Math.sin((longitude / 12) * Math.PI) + 300 * Math.sin((longitude / 30) * Math.PI)) * 2) / 3
  return value
}
