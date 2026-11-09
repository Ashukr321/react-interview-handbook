---
title: "What is Tree Shaking?"
tags: ["tree-shaking", "bundler", "es-modules", "build"]
difficulty: "medium"
---

## Short answer

Tree shaking is a build-time optimization where the bundler removes code that is exported but never imported or used, often called dead code elimination. It relies on the static structure of ES modules (`import`/`export`), so tools like Rollup, Vite, webpack and esbuild can see which exports are used and drop the rest from the final bundle.

## Explanation

Imagine shaking a tree: the dead leaves fall off and only the living branches remain. Your app imports a few functions from a library; tree shaking keeps those and drops the rest.

### Why ES modules make it possible

ES module imports are static: they sit at the top level and use fixed names, so the bundler can analyze them without running the code. CommonJS `require()` is dynamic (it can be conditional or computed), so bundlers usually cannot safely remove its unused parts.

```text
utils.js exports: formatDate, formatMoney, parseCsv, slugify
app.js imports:   formatDate
                     |
            bundler marks used exports
                     |
final bundle:     formatDate only   (others removed by minifier)
```

### Side effects

The bundler only removes a module if it is sure importing it does nothing else (no global changes, no polyfills, no CSS injection). Packages declare this in `package.json`:

```json
{
  "name": "my-ui-lib",
  "sideEffects": ["*.css"]
}
```

`"sideEffects": false` means "every file is safe to drop if unused".

### What breaks tree shaking

| Problem | Why |
| --- | --- |
| CommonJS packages (`require`) | Not statically analyzable |
| `import * as lib` then dynamic `lib[name]` | Bundler cannot know which export is used |
| Missing `sideEffects` flag | Bundler keeps modules to be safe |
| Top-level code with side effects | Must be kept |
| Babel transforming modules to CommonJS | Set `modules: false` in `@babel/preset-env` |
| Development mode | Tree shaking runs in production builds |

## Example

```js
// Bad: pulls the whole CommonJS lodash (~70 KB min)
import _ from "lodash";
const save = _.debounce(saveDraft, 500);

// Good: ES module build, only debounce is bundled
import { debounce } from "lodash-es";
const save = debounce(saveDraft, 500);
```

```jsx
// Icon libraries: named ES imports are tree-shaken
import { Search, X } from "lucide-react";

export function SearchBar({ onClear }) {
  return (
    <div>
      <Search size={16} />
      <input />
      <button onClick={onClear} aria-label="Clear"><X size={16} /></button>
    </div>
  );
}
```

> **💡 Interview tip:** Mention that tree shaking works at the export level, not inside functions. Unused code inside a used function is removed by the minifier (Terser/esbuild), not by tree shaking.

## Common mistakes

- Assuming every library is tree-shakable; check for an ESM build and `sideEffects`.
- Setting `"sideEffects": false` on a package that imports global CSS, which removes the styles.
- Judging bundle size in development mode, where tree shaking is off.
- Large barrel files that re-export modules with side effects.

## Follow-up questions

- **Tree shaking vs code splitting?** Tree shaking removes unused code; code splitting divides used code into chunks loaded on demand.
- **How do you check it worked?** Inspect the production bundle with a visualizer or search the output for a function you did not import.
- **Does TypeScript affect it?** Compile to ES modules (`"module": "ESNext"`) so the bundler still sees `import`/`export`.

## Quick recap

- Removes unused exports at build time.
- Depends on static ES module syntax.
- `sideEffects` tells the bundler what is safe to drop.
- CommonJS, dynamic access and side effects block it.
