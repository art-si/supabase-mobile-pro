# 移动端认证与账号管理

司机、货主和 SMIS 共用的 `mobile-wechat-auth` 由 `art-supabase-pro/supabase/functions` 维护和部署。本仓不保留第二份服务端实现或迁移脚本。项目 `ckbftoopuyophiebamwy` 使用经过事务校验的数据库直接变更；权限回归位于 Pro 的 `tests/integration/mobile-account-security.sql`。

## 账号开通

- 司机：后台「系统管理 → 用户管理 → 移动端账号 → 关联司机用户」，选已有个人用户和具体司机档案。承运商归属来自司机档案；修改联系手机号不会切换司机身份。已有唯一有效对应关系已保留。新增开通前需将用户归类为员工或外部协作。
- 货主：在同一入口为每位联系人「新建货主账号」，选客户企业，可选开单归属人。账号独立于内部员工用户；同一客户可有多位联系人。没有开单归属人的账号只能查单。已开通账号不能改绑到另一客户，换企业需新建个人账号。
- 授权：需要 `System:User:ManageMobile`，新建另需 `System:User:Add`，重置密码另需 `System:User:ResetPassword`。普通管理员限定本租户。停用账号、司机/客户或租户后，现有会话也无法访问对应业务。
- 重置密码会使原移动会话失效。解绑司机时先停用客户端，再清除司机档案；业务历史不删除。删除司机或客户会列出账号引用，需先处理关联。

## 微信手机号

首次先用账号密码登录，10 分钟内到「我的 → 绑定微信手机号」完成本人授权。之后退出并用微信手机号登录。业务联系号码不自动成为微信登录凭据；手机号摘要按 `driver`、`shipper`、`smis` 分开保存。同一应用的号码不能转给另一个账号。授权码只能使用一次，失败后重新授权。

| Supabase Secret | 用途 |
| --- | --- |
| `WECHAT_MP_APPID`、`WECHAT_MP_SECRET` | 司机小程序 |
| `WECHAT_SHIPPER_MP_APPID`、`WECHAT_SHIPPER_MP_SECRET` | 货主独立小程序，可选 |
| `WECHAT_SMIS_MP_APPID`、`WECHAT_SMIS_MP_SECRET` | SMIS 小程序 |
| `WECHAT_PHONE_BINDING_KEY` | 至少 32 字符的服务端随机摘要密钥 |

按当前项目约定，货主未配置独立凭据时共用司机的完整凭据，前端验收构建也使用司机 AppID。将来切换独立小程序时同时配置货主的完整 AppID/Secret 和构建 AppID。仅配置其中一项会阻止该应用微信登录。所有 Secret 只留在 Supabase；不要轮换摘要密钥，除非计划让所有用户重新绑定。

构建设置 `VITE_ENABLE_WECHAT_PHONE_LOGIN=true`，并配置微信公众平台手机号能力与请求域名。H5 使用账号密码。共用 AppID 的司机、货主逐个生成预览并验收：导入各自真实构建目录，先在模拟器确认品牌、账号标签和服务连接，再从该项目取预览码。不要仅凭 CLI 成功信息判断打包对象，开发工具可能恢复其他历史测试目录。司机验收完成后再切换货主。上传发布共用同一个小程序版本，发布时需明确选择应用。

登录：`POST /functions/v1/mobile-wechat-auth`，`{ "app": "driver" | "shipper" | "smis", "phoneCode": "微信授权码" }`，返回已通过业务身份检查的 Supabase session。绑定在相同请求中加 `"action": "bind"` 和本人 Bearer access token，返回 `{ "bound": true }`。
