# Project instructions

- Put shared mobile UI, behavior, and styles in `packages/mobile-core/src`; keep app-specific data, permissions, routes, and workflows in each Git submodule.
- Apply the shared [mobile platform skill](.agents/skills/mobile-platform/SKILL.md) before changing common code or UI. Pro owns the [pinned development references](.agents/skills/mobile-platform/sources.json) for Apple Design, UI UX Pro Max and Ponytail. Use the actual target platform conventions.
- For visual direction, use the shared [mobile Apple style reference](.agents/references/apple-mobile-visual.md) to adapt Web examples to these three mobile apps.
- For icon and text alignment, use the shared layouts and review cases in [.agents/references/mobile-alignment.md](.agents/references/mobile-alignment.md).
- For motion or gesture changes, also use [.agents/references/apple-fluid-interactions.md](.agents/references/apple-fluid-interactions.md). Check direct feedback, interruptibility, and reduced motion. Use the existing platform control and motion tokens when they meet the interaction needs.
- For cross-app UI changes, verify the changed states and workflows in a mobile browser. Run type checks and builds for each consumer; use a separate output directory to preserve existing published assets.
- For Supabase changes, use the MCP project in the app's `.mcp.json`. Prefer project-scoped MCP tools; use the CLI only if MCP is unavailable. Verify data or schema changes with a focused read and run advisors when available. Keep database passwords, access tokens, and service-role keys out of the repository and client.
