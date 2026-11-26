# supabase-mobile-pro

司机端、货主端和 SMIS 共用司机端的移动样式。主仓维护样式、主题状态、字体、通用组件和构建脚本。三个 Git 子仓各自维护业务页面、登录、权限、API、路由和应用发布配置。

## 开发

使用 Node.js 22.13 或更新版本，并按主仓 `package.json` 中的版本使用 pnpm。

```sh
git clone --recurse-submodules https://gitee.com/art-si/supabase-mobile-pro.git
cd supabase-mobile-pro
pnpm modules:install
pnpm dev:h5:driver
```

已有主仓检出可用 `pnpm modules:init` 初始化或同步到主仓记录的子仓版本。用 `pnpm modules:pull` 则会快进主仓当前分支，再逐个拉取子仓，切到 `master` 并快进至 `origin/master`。如果子仓的最新提交与主仓记录的版本不同，主仓会显示子仓指针变更，可用 `pnpm modules:status` 查看。

各应用使用自己的依赖目录、锁文件和环境配置。环境配置参见对应应用的 README。

| 应用参数 | Git 子仓 |
| --- | --- |
| `driver` | `modules/supabase-mobile-tms-driver` |
| `shipper` | `modules/supabase-mobile-tms-shipper` |
| `smis` | `modules/supabase-mobile-smis` |

在主仓运行 `npm run dev:h5:driver` 启动司机端、`npm run dev:h5:shipper` 启动货主端，或 `npm run dev:h5:smis` 启动 SMIS。这些命令也可以用 `pnpm run` 执行。

用 `pnpm dev:mp-weixin <应用>` 启动指定端的小程序。`pnpm modules:check` 对三个应用做类型检查。

## 构建与发布 GitHub Pages

在主仓运行 `pnpm modules:build`，先构建完各子仓的 H5 静态站，再构建微信小程序：

| 产物 | 各子仓的输出目录 | 只构建这一套 |
| --- | --- | --- |
| H5 静态站（GitHub Pages） | `docs/` | `pnpm build:h5` |
| 微信小程序 | `dist/build/mp-weixin/` | `pnpm build:mp-weixin` |

上述命令可以加 `driver`、`shipper` 或 `smis`，只构建对应子仓。H5 包包含 `index.html`、`.nojekyll` 和相对路径的静态资源，可直接部署到 GitHub Pages 的仓库子路径。货主端未接入真实服务时，可在构建前设置 `VITE_ENABLE_DEMO=true`，生成带演示入口的 H5 包。

小程序打包后，在装有微信开发者工具的机器上用 `node scripts/check-weixin-wxss.mjs --compiler "<wcsc.exe 路径>" <小程序输出目录>` 检查原生 WXSS 编译，再打开模拟器走业务流程。该脚本可以一次检查多个输出目录。

1. 在每个子仓把源码改动和更新后的 `docs/` 一起提交。用 `git add -A -- docs/` 纳入新增资源以及已经被新构建替换的旧文件。
2. 先推送各子仓，再提交、推送主仓中的子仓指针。若 GitHub 远程名为 `github`，在各子仓用 `git push github master`。主仓的子仓地址指向 Gitee 时，也要先把对应提交推到 Gitee。
3. 在各 GitHub 子仓的 **Settings → Pages** 选择 **Deploy from a branch → `master` → `/docs`**。之后推送该分支时会发布对应的静态包。[GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Android 调试包

司机端和货主端沿用 Note 项目的 Capacitor 8 方案。Android 应用从包内加载各自的 Uni-app H5 产物，使用子仓的 H5 环境配置。请使用 HTTPS 服务地址。调试包使用本机 Gradle 默认调试证书。

安装 JDK 21、Android SDK Platform 36 和 Build-Tools 35.0.0，然后设置 `JAVA_HOME` 和 `ANDROID_HOME`。在主仓执行：

```sh
pnpm modules:install
pnpm build:android driver
pnpm build:android shipper
```

也可以直接运行 `pnpm build:android` 构建两个应用。调试 APK 分别写入 `artifacts/android/driver/` 和 `artifacts/android/shipper/`，包名分别为 `com.artsi.tms.driver.debug` 和 `com.artsi.tms.shipper.debug`。APK 版本取自各子仓的 `src/manifest.json`。

默认使用生成工程的 Gradle Wrapper。如果下载 Gradle 受限，可把 `GRADLE_HOME` 指向本机已安装的同版本 Gradle（当前为 8.14.3）。

如需在 Android Studio 中调试，运行 `pnpm android:sync driver` 或 `pnpm android:sync shipper`，再打开相应子仓的 `dist/mobile-pro-android/android`。工程由主仓脚本生成，共用原生资源维护在 `scripts/android/`。

## 移动端底座与接入

- 运行时：Pro 的 `packages/mobile-core/src` 是公共控件、行为和主题语义变量的唯一维护点。既有独立项目通过 pnpm 安装锁定提交的 `supabase-mobile-pro` 源码包，构建使用 `@mobile-core`；联调可以设置 `MOBILE_PRO_ROOT`。统一基础交互，不统一品牌、业务状态或权限。
- 开发与设计：在独立项目运行 `pnpm exec mobile-pro design`，从已安装的 Pro 定位统一的设计规范和 Apple Design、UI UX Pro Max、Ponytail 的固定来源。不把开发 skills 带入 App 构建，不在业务仓维护第二套规范。现有版本未包含该命令时，联调可先从 Pro 源码阅读 [移动端共用设计规则](.agents/skills/mobile-platform/SKILL.md)。
- 更新顺序：先在 Pro 实现并验收，再发布当前使用的源码包，最后让业务仓更新依赖和锁文件并跑类型检查、单测、H5、小程序和受影响流程；不要为了更新依赖改动线上数据或重新发布既有静态页面。

## 公共样式

在 `packages/mobile-core/src` 修改公共实现。三端从同一套 Sass 样式获取主题色、字体、卡片、按钮和表单控件样式。主题选择沿用各自的缓存键，图标字体沿用各自的图标集。业务页面的专有样式放在所在子仓。

三个子仓的登录路由统一渲染 `packages/mobile-core/src/components/MobileLogin.vue`。登录布局、校验、加载状态和账号记忆由主仓维护。子仓提供品牌文案、账号规则、认证回调和登录后的跳转。其他可复用的页面和组件也按这条边界组织。

顶部栏、底部导航、图标和字库、指标卡、状态标签也使用主仓组件。子仓传递各自的导航入口、指标数据和业务状态。应用初始化、启动时加载数据和图片选择的公共实现位于 `packages/mobile-core/src`。

危险操作使用 `MobileConfirmDialog`，设置卡片底部的退出入口使用 `.mobile-row--danger`，空列表和搜索无结果使用 `MobileEmptyState`。各端提供文案和操作回调；取消确认、焦点恢复、状态版式和样式由主仓维护。

自定义弹层使用 `useOverlayFocus` 管理焦点范围和关闭后的归还；多字段表单可用 `revealControl` 定位首个需修正的字段。读取失败使用 `MobileLoadError` 说明问题并提供重试入口。
