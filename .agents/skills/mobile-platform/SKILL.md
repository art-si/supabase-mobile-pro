---
name: mobile-platform
description: Shared implementation and visual review rules for supabase-mobile-pro consumers on H5, WeChat Mini Programs and Capacitor.
---

# Mobile platform

## Start with the platform

1. Check `packages/mobile-core/src` for components, composables and semantic tokens before writing new ones. Reuse first, then platform APIs and existing dependencies, then the smallest new implementation (Ponytail). Do not remove validation, accessibility, authorization, offline recovery or cross-platform guards to save lines.
2. A shared control belongs in Pro when its behavior is domain-neutral and can be exercised outside the app. Accept labels, data, callbacks and variants; never import an app, assume a brand, or move a business permission into the UI layer. UI state, layout, motion, interaction and presentation tokens are Pro concerns; brand palette, copy, routes, business data/API/migrations and policy are app concerns.
3. A consumer imports from `@mobile-core` using the existing Uni build integration. Do not copy the source, patch `src/_mobile-core`, or create a second theme framework. Keep only intentional, app-specific wrappers. Keep the dependency pinned; use `MOBILE_PRO_ROOT` solely for local integration.

## Design pass

- Read Apple Design for navigation, platform expectations, typography, touch targets, safe areas, accessibility and feedback. Apply iOS principles rather than copying native effects into WeChat or H5. Use UI UX Pro Max for a specific product/interaction query and check its evidence against this app. Read [shared Apple mobile notes](../../references/apple-mobile-visual.md), [alignment](../../references/mobile-alignment.md) and [motion](../../references/apple-fluid-interactions.md) where relevant.
- Start with content, one primary action, clear hierarchy and familiar controls. Reuse semantic tokens for text, surfaces, borders, actions, focus, and motion; keep dark mode, safe-area spacing, readable type, and reduced-motion behavior intact. Don't add effects for decoration or use color alone to convey state.
- Where applicable check 320, 375 and 440 CSS px, landscape, wide layouts, dark mode, larger text, keyboard/focus, reduced motion and loaded/empty/error/disabled states. Validate H5 and WeChat builds separately; call out preview/stub vs. real devices. Verify affected consumers, not just Pro. Avoid changing published outputs during development.

## Upstream tools

The pinned [skill sources](./sources.json) are development references maintained by Pro, not runtime dependencies. Reuse the tool already installed in your agent or open the pinned source. Don't vendor upstream source trees in each application, install them in production, or enable their hooks by default. Updating the design standards or pins starts in Pro, not a consumer repository.
