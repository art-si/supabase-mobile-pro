# supabase-mobile-pro

The driver, shipper, and SMIS apps use the driver's design system. The main repository owns the shared theme, styles, font, components, and build tooling. Each Git submodule owns its business pages, authentication, permissions, API, routes, and release settings.

Use Node.js 22.13 or later and the pnpm version pinned in `package.json`.

```sh
git clone --recurse-submodules https://gitee.com/art-si/supabase-mobile-pro.git
cd supabase-mobile-pro
pnpm modules:install
pnpm dev:h5:driver
```

Run `pnpm dev:h5:driver`, `pnpm dev:h5:shipper`, or `pnpm dev:h5:smis` from the main repository. `pnpm dev:h5` defaults to the driver app. Use `pnpm.cmd run dev:h5:driver` if Windows PowerShell blocks `pnpm.ps1`.

Use `driver`, `shipper`, or `smis` with `pnpm dev:h5`, `pnpm dev:mp-weixin`, `pnpm build:h5`, or `pnpm build:mp-weixin`. `pnpm modules:check` checks types and `pnpm modules:build` builds both platforms for all three apps. Each app keeps its own dependency installation, lockfile, environment configuration, and output locations.

## Android debug builds

The Driver and Shipper apps use Capacitor 8 to bundle their Uni-app H5 builds. Install JDK 21, Android SDK Platform 36, and Build-Tools 35.0.0, then set `JAVA_HOME` and `ANDROID_HOME`. Configure an HTTPS service endpoint with the same environment variables as the H5 app.

```sh
pnpm modules:install
pnpm build:android driver
pnpm build:android shipper
```

Run `pnpm build:android` to build both apps. Debug APKs are written to `artifacts/android/<app>/` with the local Gradle debug certificate. Run `pnpm android:sync <app>` to generate the Android Studio project at `dist/mobile-pro-android/android` inside the app's Git submodule. Common native resources are maintained in `scripts/android/`.

The Gradle Wrapper is used by default. If it cannot download Gradle, set `GRADLE_HOME` to a local installation of the same version (currently 8.14.3).

Edit the shared source in `packages/mobile-core/src`. Development, builds, and type checks copy it into each app's ignored `src/_mobile-core/` directory for the mini program compiler. Restart a running development server to pick up changes to the shared source. A standalone app checkout can locate a sibling `supabase-mobile-pro` checkout or use `MOBILE_PRO_ROOT` to locate the matching platform version.

Push submodule commits first, then commit the updated Git submodule pointers in the main repository.
