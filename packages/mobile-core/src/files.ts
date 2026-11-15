import { isAndroidApp } from './platform'

type ImageSource = 'album' | 'camera'

export async function chooseImages(count = 3, failureMessage = '选择图片失败'): Promise<string[]> {
  if (count < 1) return []

  let sourceType: ImageSource[] = ['album', 'camera']
  if (isAndroidApp()) {
    const source = await pickAndroidImageSource(failureMessage)
    if (!source) return []
    sourceType = [source]
    // Android WebView opens the camera only for a single capture input.
    if (source === 'camera') count = 1
  }

  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType,
      success(result) {
        const paths = result.tempFilePaths
        resolve(Array.isArray(paths) ? paths : paths ? [paths] : [])
      },
      fail(error) {
        if (isCancelled(error.errMsg)) {
          resolve([])
          return
        }
        reject(new Error(error.errMsg || failureMessage))
      }
    })
  })
}

function pickAndroidImageSource(failureMessage: string): Promise<ImageSource | undefined> {
  return new Promise((resolve, reject) => {
    const sources = ['camera', 'album'] as const
    uni.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: ({ tapIndex }) => resolve(sources[tapIndex]),
      fail: (error) => {
        if (isCancelled(error.errMsg)) resolve(undefined)
        else reject(new Error(error.errMsg || failureMessage))
      }
    })
  })
}

function isCancelled(message?: string) {
  return /cancel/i.test(message || '')
}
