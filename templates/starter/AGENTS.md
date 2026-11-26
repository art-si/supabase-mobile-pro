# 移动端项目

- 设计和共享开发规则从已安装的 Pro 获取：`pnpm exec mobile-pro design`。已有组件、语义样式与通用逻辑用 `@mobile-core`，不复制源码，不手改 `src/_mobile-core`。
- 品牌、页面、权限和数据留在本项目。新增通用能力先在 Pro 实现和测试，再升级本项目的依赖和锁文件。
