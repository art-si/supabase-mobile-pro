# supabase-mobile-pro

司机端、货主端和 SMIS 共用司机端的移动样式。主仓维护样式、主题状态、字体、通用组件和构建脚本。三个 Git 子仓各自维护业务页面、登录、权限、API、路由和应用发布配置。

## 开发

使用 Node.js 22.13 或更新版本，并按主仓 `package.json` 中的版本使用 pnpm。

```sh
git clone --recurse-submodules https://gitee.com/art-si/supabase-mobile-pro.git
cd supabase-mobile-pro
pnpm modules:install
pnpm dev:h5 driver
```

已有主仓检出可用 `pnpm modules:init` 初始化或同步到主仓记录的子仓版本。各应用使用自己的依赖目录、锁文件和环境配置。环境配置参见对应应用的 README。

| 应用参数 | Git 子仓 |
| --- | --- |
| `driver` | `modules/supabase-mobile-tms-driver` |
| `shipper` | `modules/supabase-mobile-tms-shipper` |
| `smis` | `modules/supabase-mobile-smis` |

用 `pnpm dev:h5 <应用>` 或 `pnpm dev:mp-weixin <应用>` 启动指定端。`pnpm modules:check` 对三个应用做类型检查，`pnpm modules:build` 构建三端的 H5 和微信小程序。也可用 `pnpm build:h5 <应用>` 或 `pnpm build:mp-weixin <应用>` 单独构建。产物写入各子仓原有位置。

## 公共样式

在 `packages/mobile-core/src` 修改公共实现。三端从同一套 Sass 样式获取主题色、字体、卡片、按钮和表单控件样式。主题选择沿用各自的缓存键，图标字体沿用各自的图标集。业务页面的专有样式放在所在子仓。

开发、构建和类型检查会先把公共源码同步到各子仓的 `src/_mobile-core/`，再通过 `@mobile-core/` 引用。微信小程序编译器需要在应用自己的输入目录内解析组件，因此生成目录由脚本管理并受 Git 忽略。运行中的开发服务重新启动后会同步新的公共代码。

单独检出的业务仓可通过 `MOBILE_PRO_ROOT` 指向对应版本的主仓目录，也可以和名为 `supabase-mobile-pro` 的主仓检出放在同一级。字体的生成和授权说明见 [TMS Sans SC](packages/mobile-core/assets/fonts/README.md)。

发布代码时先推送子仓提交，再在主仓更新并提交子仓指针。用 `pnpm modules:status` 查看主仓锁定的版本。
