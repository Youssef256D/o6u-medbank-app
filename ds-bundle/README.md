# MedBank (o6u-medbank-static-site@0.0.0)

This design system is the published o6u-medbank-static-site React library, bundled as a single
browser global. All 0 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.MedBank`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).
- `guidelines/` — the design system's own usage guidance (1 doc(s), see `guidelines/index.md`). Read these before composing larger layouts.

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.MedBank.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Component } = window.MedBank;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Component />);
```

## Tokens

33 CSS custom properties from o6u-medbank-static-site. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (4): `--surface`, `--surface-strong`, `--surface-soft`, …
- **typography** (7): `--font-heading`, `--font-body`, `--font-ui`, …
- **radius** (3): `--radius-lg`, `--radius-md`, `--radius-sm`
- **shadow** (2): `--shadow`, `--shadow-soft`
- **other** (17): `--bg`, `--ink`, `--muted`, …

## Components


