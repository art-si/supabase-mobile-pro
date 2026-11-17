const loginRoute = 'pages/login/index'
const loginUrl = `/${loginRoute}`
let openingLogin = false

export function redirectToLogin() {
  const pages = getCurrentPages()
  if (openingLogin || pages[pages.length - 1]?.route === loginRoute) return
  openingLogin = true

  const finish = () => { openingLogin = false }
  const reset = () => {
    uni.reLaunch({
      url: loginUrl,
      complete: finish,
      fail: () => uni.showToast({ title: '暂时无法打开登录页，请重试', icon: 'none' })
    })
  }

  // #ifdef MP-WEIXIN
  // A root tab has no history to clear. Replacing it avoids restarting the entire page stack.
  if (pages.length === 1) {
    uni.redirectTo({ url: loginUrl, success: finish, fail: reset })
    return
  }
  // #endif
  reset()
}
