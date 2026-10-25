# giscus-theme-debug

Static giscus themes matching the Fuwari blog style. No runtime color calculation, no Svelte, no build step.

## Variants

| Corners | Motion | Light | Dark |
| --- | --- | --- | --- |
| Rounded | Yes (hover/press transitions) | `light.css` | `dark.css` |
| Rounded | No | `light-noanim.css` | `dark-noanim.css` |
| Sharp | Yes | `light-norounded.css` | `dark-norounded.css` |
| Sharp | No | `light-norounded-noanim.css` | `dark-norounded-noanim.css` |

Only `light.css` and `dark.css` contain the full theme. The other six files are small `@import` wrappers that toggle border radius and/or motion, so there is a single source of truth.

The theme hue is hard-coded with the marker below and must match `siteConfig.themeColor.hue` in the blog:

```css
/* giscus-hue: 260 */
```

## Usage

Always reference an immutable commit hash, never `main`:

```text
https://cdn.jsdelivr.net/gh/SilonGJ/giscus-theme-debug@<40-char-commit-sha>/<variant>.css
```

The blog keeps the hash in `src/constants/giscus-theme.generated.ts` (written by the publish script) and selects a variant with `GISCUS_THEME_STYLE` in `src/constants/giscus-theme.ts`.

## Publish workflow

After editing any theme file:

```bash
node scripts/publish.mjs
```

The script:

1. Checks the blog hue matches `/* giscus-hue: ... */`.
2. Stages, commits and pushes the theme repo (`main`).
3. Reads the full 40-character commit hash.
4. Rewrites the blog's `src/constants/giscus-theme.generated.ts`.
5. Probes all eight jsDelivr URLs (with retries) and fails if any is not reachable.

Useful environment variable:

- `BLOG_DIR` — path to the blog repo (default: `../blog`).

## Attribution

The palette and base selectors are derived from:

- [giscus](https://github.com/giscus/giscus) built-in themes / GitHub Primer primitives (MIT)
- [hikaru-im's PR #405](https://github.com/saicaca/fuwari/pull/405) (Fuwari-style reactive giscus theme)
- [Yukari0201/Yukari0201.github.io](https://github.com/Yukari0201/Yukari0201.github.io) (MIT)

See `LICENSE` and `NOTICE`.
