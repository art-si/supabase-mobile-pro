# supabase-mobile-pro

The driver, shipper, and SMIS apps use the driver's design system. The main repository owns the shared theme, styles, font, components, and build tooling. Each Git submodule owns its business pages, authentication, permissions, API, routes, and release settings.

Use Node.js 22.13 or later and the pnpm version pinned in `package.json`.

```sh
git clone --recurse-submodules https://gitee.com/art-si/supabase-mobile-pro.git
cd supabase-mobile-pro
pnpm modules:install
pnpm dev:h5 driver
```

Use `driver`, `shipper`, or `smis` with `pnpm dev:h5`, `pnpm dev:mp-weixin`, `pnpm build:h5`, or `pnpm build:mp-weixin`. `pnpm modules:check` checks types and `pnpm modules:build` builds both platforms for all three apps. Each app keeps its own dependency installation, lockfile, environment configuration, and output locations.

Edit the shared source in `packages/mobile-core/src`. Development, builds, and type checks copy it into each app's ignored `src/_mobile-core/` directory for the mini program compiler. Restart a running development server to pick up changes to the shared source. A standalone app checkout can locate a sibling `supabase-mobile-pro` checkout or use `MOBILE_PRO_ROOT` to locate the matching platform version.

Push submodule commits first, then commit the updated Git submodule pointers in the main repository.
