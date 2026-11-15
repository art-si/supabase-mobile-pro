# TMS Sans SC

`tms-sans-sc.woff2` is the driver app's existing subset of Google's Noto Sans SC variable font. Its source is `ofl/notosanssc/NotoSansSC[wght].ttf` in the Google Fonts repository (source SHA-256 `A3041811A78C361B1DE50F953C805E0244951C21C5BD412F7232EF0D899AF0DA`). Each app ships the [SIL Open Font License](NotoSansSC-OFL.txt).

H5 and the WeChat mini program use the same embedded WOFF2 data. The variable weight range is 400–700. Characters outside the subset use the configured fallback fonts.

Run `pnpm font:css` in the main repository to regenerate the embedded Sass from the bundled WOFF2. To refresh the subset, initialize the apps, install the driver's dependencies, and run `pnpm font:css <path-to-source-ttf>`. The script collects characters from the three apps and the shared source.

`icon-manifest.json` maps all three apps’ icon names to Bootstrap Icons. After updating it, run `pnpm icons:build` from the main repository with the Driver app’s dependencies installed. This regenerates the shared glyph map and embedded icon subset. Bootstrap Icons are covered by `BootstrapIcons-MIT.txt`.
