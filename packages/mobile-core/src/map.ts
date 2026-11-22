export type MapPoint = [number, number]
export interface MapLngLat { getLng(): number; getLat(): number }
export interface MobileMapInstance {
  on(name: string, callback: (event: { lnglat: MapLngLat }) => void): void
  setCenter(point: MapPoint): void
  setZoom(value: number): void
  getZoom(): number
  setStatus?(value: Record<string, boolean>): void
  lngLatToContainer(point: MapPoint): { getX(): number; getY(): number }
  setFitView(overlays?: unknown[], immediately?: boolean, avoid?: number[], maxZoom?: number): void
  add(value: unknown): void
  remove(value: unknown): void
  destroy(): void
  getCenter(): MapLngLat
  getBounds(): { getSouthWest(): MapLngLat; getNorthEast(): MapLngLat }
}
export interface MobileMapPolygon {
  on(name: string, callback: () => void): void
  setOptions(options: Record<string, unknown>): void
}
export interface MobileMapSdk {
  Map: new (element: string, options: Record<string, unknown>) => MobileMapInstance
  Pixel: new (x: number, y: number) => unknown
  Marker: new (options: Record<string, unknown>) => {
    setPosition(point: MapPoint): void
    on(name: string, callback: () => void): void
  }
  Polygon: new (options: Record<string, unknown>) => MobileMapPolygon
  Polyline: new (options: Record<string, unknown>) => unknown
}
export interface MapFence {
  id: string
  label: string
  paths: MapPoint[][][]
  point: MapPoint
  dashed?: boolean
}

/** An image marker keeps native keyboard activation and an explicit accessible name. */
export function createMapImagePin(imageUrl: string, label: string) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'mobile-map__image-pin'
  button.setAttribute('aria-label', label)
  const image = document.createElement('img')
  image.alt = ''
  image.draggable = false
  image.src = imageUrl
  button.append(image)
  return button
}

/** Shared with search suggestions; the white eye and rim stay legible over map tiles. */
export function createMapPin(title: string) {
  const element = document.createElement('span')
  element.className = 'mobile-map__pin'
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', title)
  element.innerHTML = '<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 40S2 26 2 16a14 14 0 0 1 28 0C30 26 16 40 16 40Z" fill="currentColor" stroke="white" stroke-width="3"/><circle cx="16" cy="16" r="5" fill="white"/></svg>'
  return element
}
