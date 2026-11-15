export function chooseImages(count = 3, failureMessage = '选择图片失败'): Promise<string[]> {
  if (count < 1) return Promise.resolve([])

  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(result) {
        const paths = result.tempFilePaths
        resolve(Array.isArray(paths) ? paths : paths ? [paths] : [])
      },
      fail(error) {
        if (error.errMsg?.toLowerCase().includes('cancel')) {
          resolve([])
          return
        }
        reject(new Error(error.errMsg || failureMessage))
      }
    })
  })
}
