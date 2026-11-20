/** Display-ready media; resolving private storage URLs remains the app's responsibility. */
export interface MobileGalleryMedia {
  id: string
  url?: string
  kind?: 'image' | 'video'
  width?: number
  height?: number
  duration?: number
  poster?: string
}
