---
title: "What is Webpack and how does it create bundles?"
asked_as: ["Explain the webpack build process in JavaScript"]
tags: ["webpack", "build-tools", "bundling", "code-splitting"]
difficulty: "medium"
---

## Short answer

Webpack is a module bundler. Starting from an entry file, it follows every `import` to build a dependency graph, transforms each file with loaders (Babel, CSS, images), optimizes the graph with plugins (tree shaking, minification, chunk splitting), and writes a few browser-ready bundles with hashed file names. Vite and Rspack do the same job today with faster tooling, but the concepts are identical.

## Explanation

Think of a librarian packing books for shipping: start from one book, look up every reference it cites, collect those, translate any in foreign languages, drop duplicate pages, then pack them into a few labelled boxes.

### The build process

```text
 webpack.config.js
        |
        v
 [1] Entry: src/index.jsx
        |
        v
 [2] Resolve each import  ->  path on disk (resolve.extensions, aliases, node_modules)
        |
        v
 [3] Loaders transform file -> JS module (babel-loader, css-loader, asset modules)
        |
        v
 [4] Parse to AST, find more imports, repeat  ==>  Dependency graph
        |
        v
 [5] Seal + optimize: tree shaking, scope hoisting, SplitChunks, minify (Terser)
        |
        v
 [6] Emit chunks: main.[contenthash].js, vendors.[contenthash].js, 123.[contenthash].js
        plus runtime (module loader) and HtmlWebpackPlugin injects script tags
```

### Key concepts

| Concept | Role |
|---|---|
| Entry | Where the graph starts |
| Output | Where and how bundles are named (`[contenthash]` for long-term caching) |
| Loaders | Per-file transforms: turn JSX, TS, CSS, images into modules |
| Plugins | Hook into the whole compilation: HTML generation, env vars, CSS extraction, analysis |
| Mode | `production` turns on minification, tree shaking and scope hoisting |
| Chunks | Groups of modules; dynamic `import()` creates a new async chunk |
| Runtime | Small bootstrap that loads chunks and wires `require` calls in the browser |

Tree shaking works because ES module `import`/`export` are static; webpack marks unused exports and the minifier removes them. `"sideEffects": false` in `package.json` lets it drop whole unused files.

## Example

```js
// webpack.config.js
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "production",
  entry: "./src/index.jsx",
  output: {
    filename: "[name].[contenthash].js",
    path: __dirname + "/dist",
    clean: true,
  },
  resolve: { extensions: [".js", ".jsx"] },
  module: {
    rules: [
      { test: /\.jsx?$/, exclude: /node_modules/, use: "babel-loader" },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, "css-loader"] },
      { test: /\.(png|svg|webp)$/, type: "asset" }, // inline small, emit large
    ],
  },
  plugins: [new HtmlWebpackPlugin({ template: "./public/index.html" }), new MiniCssExtractPlugin()],
  optimization: { splitChunks: { chunks: "all" } }, // separate vendor code for better caching
};
```

```jsx
// Dynamic import creates its own chunk, loaded only when the route renders
const Reports = React.lazy(() => import("./pages/Reports"));
```

## Common mistakes

- Confusing loaders (transform one file) with plugins (act on the whole build).
- Using `[hash]` or no hash, which breaks long-term caching or busts every file on each deploy.
- Importing CommonJS libraries and expecting tree shaking to work.
- Shipping `mode: "development"` builds to production.

## Follow-up questions

- **How is Vite different?** In dev it serves native ES modules and pre-bundles dependencies with esbuild, so there is no full bundle step; production uses Rollup (Rolldown in newer versions).
- **What is Module Federation?** A webpack 5 feature that lets separately deployed apps share modules at runtime, used for micro-frontends.
- **How do you find what bloats a bundle?** `webpack-bundle-analyzer` (or `rollup-plugin-visualizer` for Vite) shows each module's size in a treemap.

## Quick recap

- Webpack builds a dependency graph from the entry.
- Loaders transform files; plugins act on the whole compilation.
- Production mode tree-shakes, hoists scope and minifies.
- Dynamic `import()` and SplitChunks create separate cacheable chunks.
- `[contenthash]` names enable long-term browser caching.
