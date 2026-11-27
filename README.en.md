# supabase-mobile-pro

The driver, shipper, and SMIS apps use the driver's design system. The main repository owns the shared theme, styles, font, components, and build tooling. Each Git submodule owns its business pages, authentication, permissions, API, routes, and release settings.

Use Node.js 22.13 or later and the pnpm version pinned in `package.json`.

```sh
git clone --recurse-submodules https://gitee.com/art-si/supabase-mobile-pro.git
cd supabase-mobile-pro
pnpm modules:install
pnpm dev:h5:driver
```

Use `pnpm modules:init` to check out the submodule commits recorded by the main repository. Use `pnpm modules:pull` to fast-forward the current branch of the main repository, then switch each submodule to `master` and fast-forward it to `origin/master`. Run `pnpm modules:status` to see which submodule commits differ from the recorded versions.

From the main repository, run `npm run dev:h5:driver` for the driver app, `npm run dev:h5:shipper` for the shipper app, or `npm run dev:h5:smis` for SMIS. These scripts also work with `pnpm run`.

Use `driver`, `shipper`, or `smis` with `pnpm dev:mp-weixin` to start a mini program in development. `pnpm modules:check` checks all three apps.

## Builds and GitHub Pages

Run `pnpm modules:build` from the main repository to build all H5 sites first, then the mini programs:

| Build | Output in each submodule | Build it separately |
| --- | --- | --- |
| Static H5 site (GitHub Pages) | `docs/` | `pnpm build:h5` |
| WeChat Mini Program | `dist/build/mp-weixin/` | `pnpm build:mp-weixin` |

Append `driver`, `shipper`, or `smis` to build a single app. Each H5 build includes `index.html`, `.nojekyll`, and relative asset URLs for hosting under a GitHub Pages repository path. If the Shipper backend is not connected, set `VITE_ENABLE_DEMO=true` before building to include the demo entry point.

After building a mini program, run `node scripts/check-weixin-wxss.mjs --compiler "<path to wcsc.exe>" <mini-program output>` on a machine with WeChat DevTools before testing workflows in its simulator. You can pass several output directories in one run.

1. Commit the rebuilt `docs/` alongside the source changes in each submodule. Use `git add -A -- docs/` to include both new assets and deletions of files replaced by the new build.
2. Push the submodules before committing and pushing the new pointers from the main repository. If the GitHub remote is named `github`, run `git push github master` in each submodule. If the main repository references Gitee submodule URLs, push those commits there as well before updating the pointers.
3. In **Settings → Pages** of each GitHub repository, select **Deploy from a branch → `master` → `/docs`**. Future pushes to that branch publish the updated static files. See the [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Android debug builds

The Driver and Shipper apps use Capacitor 8 to bundle their Uni-app H5 builds. Install JDK 21, Android SDK Platform 36, and Build-Tools 35.0.0, then set `JAVA_HOME` and `ANDROID_HOME`. Configure an HTTPS service endpoint with the same environment variables as the H5 app.

```sh
pnpm modules:install
pnpm build:android driver
pnpm build:android shipper
```

Run `pnpm build:android` to build both apps. Debug APKs are written to `artifacts/android/<app>/` with the local Gradle debug certificate. Run `pnpm android:sync <app>` to generate the Android Studio project at `dist/mobile-pro-android/android` inside the app's Git submodule. Common native resources are maintained in `scripts/android/`.

The Gradle Wrapper is used by default. If it cannot download Gradle, set `GRADLE_HOME` to a local installation of the same version (currently 8.14.3).

Edit the shared source in `packages/mobile-core/src`. Development, builds, and type checks copy it into each app's ignored `src/_mobile-core/` directory for the mini program compiler. Restart a running development server to pick up changes to the shared source. For a standalone app checkout, `pnpm install` downloads the pinned Gitee archive. A checkout under the main repository's `modules/` directory uses the local shared sources. Set `MOBILE_PRO_ROOT` to use a local platform checkout for joint development.

Use `MobileThemeCards` for reusable skin previews. Pass the selected value and options containing `id`, `name`, `description`, and `preview` colors (`background`, `surface`, `ink`, `accent`). It emits `update:modelValue`; each app owns its palettes, light or dark appearance, and persistence.

Use `MobileCalendarDate` with a local timestamp in `v-model` and control its panel with `v-model:visible`. It selects a date by default; `show-time` adds hour and minute selection in the same panel and returns a timestamp at minute precision. Use `trigger-id` to restore focus and `disable-future` to disallow future dates and times.

Pro owns the shared Vue, Pinia, Wot UI, Uni-app, build, and type-check tool versions. Each app's `mobile-pro` command uses the pinned archive and its installed dependencies. To upgrade, publish a tested Pro commit, then pin that same commit in each consumer and refresh their pnpm lockfiles.

Pro also owns the shared Capacitor platform, CLI, and plugin versions. Each native app selects the plugins it syncs through Capacitor's `includePlugins` setting.

Use `MobileConfirmDialog` for destructive confirmations, `.mobile-row--danger` for the centered sign-out row, and `MobileEmptyState` for empty lists and search results. Apps supply the text and action callbacks; the shared components own presentation and keyboard behavior.

Use `useOverlayFocus` for focus handling in custom overlays, `revealControl` to direct people to the first field that needs correction, and `MobileLoadError` to present load failures and retry actions consistently.
