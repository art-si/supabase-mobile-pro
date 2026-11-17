# 微信手机号一键登录

货主和 SMIS 共用 `mobile-wechat-auth`。第一次用原有账号密码进入小程序，在「我的」选择「绑定微信手机号」；以后可从登录页用微信手机号授权登录。绑定需要最近 10 分钟内的密码登录。更换号码时，用同一账号重新用密码登录并重新绑定；同一应用中，一个手机号不能绑定多个账号。

认证流程只使用微信服务端验证返回的号码。绑定只保存按应用计算的手机号摘要和已有 Auth 账号 ID，不读取业务联系号码，不注册业务账号，不调整权限。登录时，货主继续走客户资料或现有 TMS 员工权限，SMIS 继续走账号状态、租户状态和隐患上报资料访问规则。密码登录、演示和司机端现有接口使用原路径。H5 不展示微信小程序授权入口。

## 开启条件

1. 在目标项目应用本目录的手机号绑定迁移，并部署 `mobile-wechat-auth`（登录前还没有 JWT，绑定动作自身验证会话和最近的密码登录）。
2. 配置 Supabase Secrets：

   | Secret | 用途 |
   | --- | --- |
   | `WECHAT_SHIPPER_MP_APPID`、`WECHAT_SHIPPER_MP_SECRET` | 货主微信小程序 |
   | `WECHAT_SMIS_MP_APPID`、`WECHAT_SMIS_MP_SECRET` | SMIS 微信小程序 |
   | `WECHAT_PHONE_BINDING_KEY` | 至少 32 字符的随机独立密钥，只用于手机号摘要 |

   轮换手机号摘要密钥后，旧绑定需要重新建立。AppSecret、摘要密钥和 Supabase 服务角色密钥都留在服务端。
3. 在各子仓的 `src/manifest.json` 配置对应的微信小程序 AppID，并在微信公众平台配置手机号授权能力和 Supabase 请求域名。构建时设置 `VITE_ENABLE_WECHAT_PHONE_LOGIN=true`。货主客户登录还需要对应环境的 `tms-shipper` 业务服务与账户绑定。
4. 用各自的微信体验版执行：拒绝授权 → 未绑定回退账号密码 → 密码登录并绑定 → 退出 → 手机一键登录 → 确认打开的是原账号与业务权限。

司机的 AppID 可在开发者工具的临时本地副本复用来查看界面。一套 AppID 只能管理一套小程序发布版本。临时副本不上传，生产端点要求各应用独立使用微信凭据。

## 接口约定

- 登录：`POST /functions/v1/mobile-wechat-auth`，`{ "app": "shipper" | "smis", "phoneCode": "微信授权码" }`，成功返回 Supabase session。
- 绑定：同一 URL，加入 `"action": "bind"` 并发送当前账号的 Bearer access token，成功返回 `{ "bound": true }`。
- 授权码是一次性的。接口失败后应发起新授权；前端不会自动重放。
