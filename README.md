# giscus-theme-debug

Static giscus themes based on the giscus theme from
[Yukari0201/Yukari0201.github.io](https://github.com/Yukari0201/Yukari0201.github.io).
No Svelte, no runtime hue calculation, no data URI, no build step.

## Variants

| Corners | Motion | Light | Dark |
| --- | --- | --- | --- |
| Rounded | giscus default | `light.css` | `dark.css` |
| Rounded | Disabled | `light-noanim.css` | `dark-noanim.css` |
| Sharp | giscus default | `light-norounded.css` | `dark-norounded.css` |
| Sharp | Disabled | `light-norounded-noanim.css` | `dark-norounded-noanim.css` |

Only `light.css` and `dark.css` contain the full theme (palette + base layout).
The other six files are small `@import` wrappers that toggle border radius
and/or motion, so there is a single source of truth.

The theme hue is hard-coded with the marker below and must match
`siteConfig.themeColor.hue` in the blog:

```css
/* giscus-hue: 260 */
```

## Upstream source

- Repository: `Yukari0201/Yukari0201.github.io`
- Branch: `astro`
- Commit: `1ea16f558c9f5df8322fb3383cbed9b334b2866f`
- Files used:
  - `src/styles/giscus-base.css`
  - `src/styles/giscus-light.css`
  - `src/styles/giscus-dark.css`

Those three files are byte-identical (same sha256) to
[`hikaru-im/akari`](https://github.com/hikaru-im/akari), the origin of
Fuwari PR #405.

### Static conversion

The upstream theme builds a `data:text/css;base64,...` URI at runtime from
`main { --hue: N }` + palette + base. This repository removes that mechanism:

- Every `var(--hue)` is replaced with the literal hue `260`.
- Every `calc(var(--hue) ± N)` is evaluated and normalized to `0–360`:
  - `+30` → `290`, `+40` → `300`, `+60` → `320`
  - `+120` → `20`, `+180` → `80`
  - `-30` → `230`, `-60` → `200`
- The three invalid `oklch(..., 0.4)` alpha declarations are fixed to
  `oklch(... / 0.4)`.
- The base layout's `border-radius` values use
  `var(--giscus-radius-card, 1rem)` / `var(--giscus-radius-control, 0.5rem)`
  so the sharp-corner variants can set them to `0` without duplicating the base.

Everything else (palette, `.gsc-*` layout rules, native CSS nesting) is kept
from upstream.

## Usage

Always reference an immutable commit hash, never `main`:

```text
https://fastly.jsdelivr.net/gh/SilonGJ/giscus-theme-debug@<40-char-commit-sha>/<variant>.css
```

The blog builds all eight URLs from `GISCUS_THEME_VERSION` in
`src/components/Giscus.astro` and picks a pair at runtime from the `dark`,
`no-animations` and `no-rounded` classes on `<html>`. That lookup is the only
dynamic part; every visual rule still lives in the CSS files above.

The `*-noanim.css` wrappers also hide the animated Mona loading GIF, because
`animation: none` cannot stop a GIF.

## Publish workflow

After editing any theme file:

```bash
node scripts/publish.mjs
```

The script:

1. Checks the blog hue matches `/* giscus-hue: ... */` and that the blog's
   `src/components/Giscus.astro` contains exactly one `GISCUS_THEME_VERSION`.
2. Stages, commits and pushes the theme repo (`main`).
3. Reads the full 40-character commit hash.
4. Rewrites `GISCUS_THEME_VERSION` in the blog's `src/components/Giscus.astro`.
5. Probes all eight jsDelivr URLs (with retries) and fails if any is not
   reachable.

Useful environment variable:

- `BLOG_DIR` — path to the blog repo (default: `../blog`).

## Attribution

- [Yukari0201/Yukari0201.github.io](https://github.com/Yukari0201/Yukari0201.github.io)
  (MIT) — the palette and base layout used here.
- [hikaru-im/akari](https://github.com/hikaru-im/akari) / Fuwari PR #405 —
  upstream source of the same files.
- [giscus](https://github.com/giscus/giscus) and GitHub Primer primitives
  (MIT) — the underlying variable names and default styles.

See `LICENSE` and `NOTICE`.
