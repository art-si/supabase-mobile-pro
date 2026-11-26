# 独立应用接入与升级

Pro 维护公共布局、控件、交互、主题变量、工具链和设计规则。业务端维护品牌、路由、文案、数据、接口和权限。不要把某个应用的密钥、包名或者整套皮肤移进公共库。已经有对应组件时，先组合现有组件，不为一次性页面新建通用抽象。

## 从零建项目

从 Pro 检出执行下面的命令，把示例 SHA 替换成已发布的 **40 位提交**。当前线上分发是 Gitee 源码包，通过 pnpm 安装，并不要求发布到公共 npm registry。

```sh
node scripts/mobile-cli.mjs init ../my-mobile-app --pro https://gitee.com/art-si/supabase-mobile-pro/repository/archive/<SHA>.tar.gz
cd ../my-mobile-app
pnpm install
pnpm exec mobile-pro design
pnpm dev:h5
```

目录必须不存在；模板没有环境变量、远端账号或真机配置。微信导入前填自己的 AppID，原生端按各自的签名和权限配置。将首次安装生成的 pnpm 锁文件提交，CI 使用 `pnpm install --frozen-lockfile`。模板包含一个不调用网络的页面，可先核对公共工作区、可访问操作和加载状态。

## 已有应用迁移

1. 对照 Pro 的 README 中列出的公共能力，盘点本地样式和组件。先迁移同语义同交互的部分，保留业务规则和品牌差异。
2. 发布并验证指定 Pro 提交；在业务仓更新 `supabase-mobile-pro` 安装源和锁文件。首次验收必须独立检出，不设置 `MOBILE_PRO_ROOT`，以免本地源码遮盖分发缺件。联调再使用该变量或 Pro 的 `modules/`；CLI 的 `design` 始终跟随提供命令的包版本。
3. 执行 `pnpm typecheck`、项目已有单测、`pnpm build:h5` 和 `pnpm build:mp-weixin`。有原生端的项目独立做 Capacitor 同步及真机冒烟。核查生成目录未进 Git、旧包可回退、线上静态产物没有被测试覆盖。
4. Fishing 首验重点：加载/登录、表单/确认弹层、深浅色与大字、跨标签切换账号与迟到响应。设计入口验证可用后，在同次变更把 Fishing AGENTS.md 改为公共入口并删除旧 Skills 副本。司机端、货主端与 SMIS 随后分别更新，不用一次升级掩盖回归。

## 发布验收

- `pnpm test:platform`：无需安装业务端，检查独立/混合版本 CLI、创建模板、生成目录归属及重复同步。
- `pnpm test:starter`：打包本地 Pro，模拟新项目真实安装，跑类型检查、H5、微信构建并检查产物。需要网络和 Node/pnpm；不发布、不使用业务账号。可用 `--pack-only` 仅验证打包、解包、模板和同步。
- 本地打包验收不能代替真实 Gitee 归档安装，也不能代替真机验收。公共 UI 交付另看 320/375/440、横屏、宽屏、深色、大字、键盘/焦点、减少动效和错误恢复。误回滚时只恢复业务仓包 pin 与对应锁文件。
