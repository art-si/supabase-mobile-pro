let enabled = false
// #ifdef MP-WEIXIN
enabled = (import.meta.env as { VITE_ENABLE_WECHAT_PHONE_LOGIN?: string }).VITE_ENABLE_WECHAT_PHONE_LOGIN === 'true'
// #endif
export const isWechatPhoneLoginEnabled = enabled

const messages: Readonly<Record<string, string>> = {
  WECHAT_PHONE_INVALID_CODE: '手机号授权已失效，请重新授权。',
  WECHAT_PHONE_NOT_ALLOWED: '该手机号暂不能登录当前应用，请用账号密码登录。',
  WECHAT_PHONE_ALREADY_BOUND: '该手机号已绑定其他账号，请联系管理员。',
  WECHAT_PHONE_PASSWORD_REQUIRED: '请用账号密码重新登录，再绑定微信手机号。',
  WECHAT_PHONE_UNAVAILABLE: '手机号登录暂不可用，请用账号密码登录。'
}

export function wechatPhoneLoginError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : ''
  const message = Object.prototype.hasOwnProperty.call(messages, code) ? messages[code] : undefined
  return message ?? '手机一键登录没成功，请重试或用账号密码登录。'
}

export type WechatPhoneEvent = { code?: string; detail?: { code?: string } }
export const wechatPhoneCode = (event?: WechatPhoneEvent) => event?.detail?.code ?? event?.code
