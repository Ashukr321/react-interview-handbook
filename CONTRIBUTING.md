# Contributing to React Interview Handbook

Thanks for helping make React interview prep better for everyone! 🎉

Whether you fix a typo, correct an outdated answer, add a new question or improve the site, every contribution counts. This guide explains how.

## Table of contents

- [Ways to contribute](#ways-to-contribute)
- [Ground rules](#ground-rules)
- [Local setup](#local-setup)
- [Adding or editing a question](#adding-or-editing-a-question)
- [Writing style](#writing-style)
- [Adding a new section](#adding-a-new-section)
- [Working on the site code](#working-on-the-site-code)
- [Commit messages](#commit-messages)
- [Pull request checklist](#pull-request-checklist)
- [Reporting a problem](#reporting-a-problem)

## Ways to contribute

| Contribution | Where |
|---|---|
| Fix a wrong, unclear or outdated answer | `content/<section>/<question>.md` |
| Add a missing interview question | A new file in the right `content/<section>/` folder |
| Add a better example, diagram or follow-up question | The question's Markdown file |
| Improve the UI, search, accessibility or performance | `src/` |
| Report a bug or a wrong answer | [GitHub Issues](https://github.com/Ashukr321/react-interview-handbook/issues) |

Not sure if an idea fits? Open an issue first and ask.

## Ground rules

- **Be kind and constructive.** Review the content, not the person.
- **Accuracy first.** If you change a technical claim, link a source (react.dev, MDN, the Next.js docs or the library's own docs) in your PR description.
- **Write it yourself.** Don't paste copyrighted text from books, courses or blog posts. Short quotes with attribution are fine.
- **One topic per PR** where possible. Small PRs get reviewed and merged faster.

## Local setup

Requires **Node.js 20.9+** and npm.

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/react-interview-handbook.git
cd react-interview-handbook

# 2. Install dependencies
npm install

# 3. Create a branch
git checkout -b fix/usememo-example

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000. Pages reload automatically when you save a Markdown file.

> **Note:** if you add a brand-new file or folder and its page shows a 404 in dev, restart `npm run dev`.

## Adding or editing a question

All content lives in `content/`, one folder per section and one Markdown file per question:

```text
content/
  07-fiber-and-reconciliation/
    index.md                         ← section metadata
    01-what-is-react-fiber.md        ← one file per question
    02-why-fiber-architecture.md
```

### File naming

- Name the file `NN-short-kebab-slug.md`.
- `NN` is the two-digit position in the section (`01`, `02`, ...). It sets the order on the site.
- Keep the slug short (up to about 6 words), lowercase, with only `a-z`, `0-9` and `-`.
- To add a question at the end of a section, use the next number. Avoid renumbering existing files, because that changes their URLs.

### Frontmatter

Every question file starts with YAML frontmatter:

```yaml
---
title: "What is React Fiber?"
asked_as: ["Explain Fiber architecture"]   # optional: other wordings of the same question
tags: ["fiber", "internals"]
difficulty: "medium"                        # easy | medium | hard
---
```

- Use double quotes for strings, and escape inner quotes as `\"`.
- `title` is rendered as the page heading, so **don't add a `#` heading** in the body.
- If the question is a near-duplicate of one that already exists in the same section, add its wording to that file's `asked_as` instead of creating a new file.

### Body structure

Start body headings at `##`. Use this structure for **concept questions**:

````markdown
## Short answer

2-4 sentences you could say out loud in an interview. Lead with the direct answer.

## Explanation

The deeper "why". Use `###` sub-headings, lists and tables where they help.

## Example

```jsx
// small, correct React code
```

## Common mistakes

- 2-4 pitfalls or misconceptions

## Follow-up questions

- **A likely follow-up?** A one or two sentence answer.

## Quick recap

- 3-5 one-line bullets
````

Use this structure for **scenario questions** ("Your app does X, what do you do?"):

```markdown
## Short answer
## Why it happens
## How to fix it
## How to verify
## Follow-up questions
## Quick recap
```

The "On this page" menu is built automatically from your `##` and `###` headings.

### Supported Markdown

Plain [GitHub-flavored Markdown](https://github.github.com/gfm/) only:

- ✅ Headings, lists, **bold**, `inline code`, links and tables
- ✅ Fenced code blocks **with a language**: `jsx`, `tsx`, `js`, `ts`, `bash`, `json`, `html`, `css` or `text`
- ✅ ASCII diagrams inside a ` ```text ` block
- ✅ Callouts as blockquotes: `> **💡 Interview tip:** ...` or `> **⚠️ Gotcha:** ...`
- ❌ No raw HTML tags and no MDX or JSX components outside code blocks (they won't render)

## Writing style

- **Plain English.** Write for someone preparing for interviews, not for the React core team. Short sentences, active voice.
- **Answer first.** Put the direct answer in the first sentence of "Short answer".
- **Current React.** Use function components and hooks, React 18/19 APIs, Redux Toolkit, React Router 6.4+/7 and the Next.js App Router. Mention class components only when the question asks about them.
- **Correct code.** Examples should run if pasted into a real project, apart from obviously stubbed helpers.
- **Length.** Aim for 300-650 words per question. Cut filler, and don't end with "In conclusion".
- **Version claims.** When something depends on a version (for example "React 19 added `use`"), name the version.

## Adding a new section

1. Create a folder `content/NN-section-slug/` using the next free number.
2. Add `index.md`:

   ```markdown
   ---
   title: "Testing"
   order: 30
   part: "Question Bank"        # or "Scenario-Based"
   description: "One sentence on what this section covers."
   ---

   Two or three sentences introducing the section and why it matters in interviews.
   ```

3. Add question files as described above.
4. Add the section to the tables in [README.md](README.md).

The sidebar, home page, search and sitemap pick it up automatically. No code changes are needed.

## Working on the site code

| Path | What it does |
|---|---|
| `src/lib/content.ts` | Reads `content/` and builds sections, topics, headings and the search index |
| `src/lib/site.ts` | Site name, URL and description used for SEO |
| `src/app/` | Pages (home, section, question), sitemap, robots, manifest, OG image |
| `src/components/` | Sidebar, Search, Markdown renderer, theme toggle, service-worker registration |
| `src/app/globals.css` | All styles and the light/dark theme tokens |
| `public/sw.js` | Service worker for offline support. Bump `CACHE` when you change its strategy. |

Please keep changes small, and test them on a phone-sized screen as well as desktop. Keep the site keyboard accessible.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org):

```text
content(hooks): fix useLayoutEffect example
content(scenarios): add question on hydration mismatch
fix(search): match questions by tag
feat(ui): add copy button to code blocks
docs: update contributing guide
```

## Pull request checklist

Before you open a PR, check that:

- [ ] `npm run build` passes (it renders every page, so it catches broken frontmatter)
- [ ] `npm run lint` passes if you changed code
- [ ] New question files follow the naming, frontmatter and heading rules above
- [ ] Code blocks have a language, and the examples are correct
- [ ] Technical changes link a source in the PR description
- [ ] You checked the page in the browser (light and dark theme, and a phone-sized screen for UI changes)

Then open the PR against `main` with a short description of **what** changed and **why**. A maintainer will review it, and may suggest edits before merging.

## Reporting a problem

[Open an issue](https://github.com/Ashukr321/react-interview-handbook/issues/new) and include:

- the page link (for example `https://react-interview-handbook.vercel.app/04-events/03-what-is-synthetic-event`)
- what is wrong or unclear
- what it should say, with a source if you have one

---

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
