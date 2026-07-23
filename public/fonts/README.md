# Fonts

The site uses **Letter Gothic Std** (licensed). Drop the self-hosted web-font
files here so `@font-face` in `src/app/globals.css` can load them. Until they
exist, the site falls back to a monospace stack (`ui-monospace`, Courier New)
so nothing breaks.

Expected files (WOFF2, in this folder):

| File | Weight | Style |
|------|--------|-------|
| `letter-gothic-std.woff2` | 400 (Medium) | normal |
| `letter-gothic-std-bold.woff2` | 700 (Bold) | normal |
| `letter-gothic-std-slanted.woff2` | 400 | italic (Slanted/oblique) |

If your license only provides `.otf`/`.ttf`, convert to `.woff2` (e.g. with
`fonttools` or an online converter) for best performance, or add extra `src`
formats to the `@font-face` rules in `globals.css`.
