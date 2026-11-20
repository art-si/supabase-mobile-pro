export type MapProvider = 'amap' | 'baidu'
export interface MapLinkPlace {
  label: string
  longitude?: number | null
  latitude?: number | null
  /** Approximate/shared areas must open a name search, not an exact destination. */
  approximate?: boolean
  /** Route planning is available only for an explicitly shared exact destination. */
  navigation?: boolean
}
const query = (values: Record<string, string | number>) => Object.entries(values).map(([key,value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')
export function mapLinks(provider: MapProvider, place: MapLinkPlace, platform: 'ios' | 'android' = 'android') {
  const label = place.label.trim()
  if (!label || label.length > 500) throw new Error('地点名称无效')
  const exact = !place.approximate && typeof place.longitude === 'number' && typeof place.latitude === 'number'
    && Number.isFinite(place.longitude) && Number.isFinite(place.latitude)
    && Math.abs(place.longitude) <= 180 && Math.abs(place.latitude) <= 90
  if (provider === 'amap') {
    if (exact && place.navigation) {
      const values = { to: `${place.longitude},${place.latitude},${label}`, mode: 'car', coordinate: 'gaode', src: 'diaoyouji' }
      return { app: `https://uri.amap.com/navigation?${query({ ...values, callnative: 1 })}`, web: `https://uri.amap.com/navigation?${query({ ...values, callnative: 0 })}` }
    }
    const parameters: Record<string,string> = exact ? { position: `${place.longitude},${place.latitude}`, name: label, coordinate: 'gaode' }
      : { keyword: label, view: 'map' }
    const endpoint = exact ? 'marker' : 'search'
    const values = { ...parameters, src: 'diaoyouji' }
    return { app: `https://uri.amap.com/${endpoint}?${query({ ...values, callnative: 1 })}`, web: `https://uri.amap.com/${endpoint}?${query({ ...values, callnative: 0 })}` }
  }
  const parameters: Record<string,string> = exact && place.navigation
    ? { origin: '我的位置', destination: `latlng:${place.latitude},${place.longitude}|name:${label}`, mode: 'driving' }
    : exact ? { location: `${place.latitude},${place.longitude}`, title: label, content: label }
    : { address: label }
  const endpoint = exact && place.navigation ? 'direction' : exact ? 'marker' : 'geocoder'
  const values = { ...parameters, coord_type: 'gcj02' }
  return {
    app: `baidumap://map/${endpoint}?${query({ ...values, src: `${platform === 'ios' ? 'ios' : 'andr'}.diaoyouji.mobile` })}`,
    web: `https://api.map.baidu.com/${endpoint}?${query({ ...values, output: 'html', src: 'webapp.diaoyouji.mobile' })}`
  }
}
