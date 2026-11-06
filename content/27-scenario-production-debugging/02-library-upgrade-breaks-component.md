---
title: "A component breaks when upgrading a library version — how do you manage dependencies?"
tags: ["dependencies", "npm", "semver", "upgrades"]
difficulty: "medium"
---

## Short answer

I roll back or pin the previous version to unblock users, then read the changelog and migration guide to find the breaking change. I reproduce it in a branch, fix it with the smallest change, and protect against repeats with a lockfile, exact or caret ranges used deliberately, automated update PRs (Renovate/Dependabot) and tests that cover the integration.

## Why it happens

- **Semver was not respected**, or a "minor" release changed behavior you relied on.
- **Major bump** with documented breaking API changes (removed props, new defaults, ESM-only).
- **Transitive dependency** changed because the lockfile was regenerated.
- **Peer dependency mismatch**, e.g. a library still expects React 18 while you run React 19.
- **Duplicate copies** of React or a context-based library in the bundle, so hooks and context break.

## How to fix it

### 1. Stabilize first

```bash
git revert <upgrade-commit>        # or
npm install some-lib@4.2.1 --save-exact
```

### 2. Find what changed

```bash
npm ls some-lib                     # which versions are installed, by whom
npm ls react                        # duplicate React copies?
npx npm-check-updates --target minor
```

Read the changelog between the two versions, search the library's issues for your error message, and diff the behavior in a small reproduction.

### 3. Fix in a branch

```jsx
// v5 renamed `isOpen` to `open` and made `onClose` required
<Dialog open={isOpen} onClose={() => setOpen(false)}>
  ...
</Dialog>
```

If many files use the library, wrap it once so the next upgrade touches one file:

```jsx
export function AppDialog({ isOpen, onDismiss, children }) {
  return <Dialog open={isOpen} onClose={onDismiss}>{children}</Dialog>;
}
```

### 4. Prevent the next break

| Practice | Why |
| --- | --- |
| Commit the lockfile, use `npm ci` in CI | Same tree everywhere |
| Renovate/Dependabot, one library per PR | Small, reviewable upgrades |
| Run unit + e2e tests on update PRs | Catches behavior changes |
| `overrides` / `resolutions` | Force a safe transitive version |
| Upgrade regularly | Small steps beat a two-year jump |

> **⚠️ Gotcha:** `npm install` can quietly update the lockfile; CI should use `npm ci` so it fails instead.

## How to verify

- Tests and a visual/e2e run on the affected screens pass.
- `npm ls` shows a single version of React and the library.
- Ship behind a canary or feature flag and watch error monitoring for new issues.

## Follow-up questions

- **Caret vs tilde?** `^1.2.3` allows minor and patch updates; `~1.2.3` allows only patches.
- **What are peer dependencies?** Packages the library expects the host app to provide, like `react`, so only one copy exists.
- **How do you handle a library that is abandoned?** Fork or patch it (`patch-package`), and plan a replacement behind your wrapper.

## Quick recap

- Roll back or pin first, investigate second.
- Changelog, `npm ls`, and a small repro find the breaking change.
- Wrap third-party APIs so upgrades touch one place.
- Lockfile, `npm ci`, automated small upgrade PRs and tests prevent repeats.
