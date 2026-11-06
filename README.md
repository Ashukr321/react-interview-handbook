# React Interview Handbook

Every question from the two interview banks in `resources/` answered in plain English with React code, published as a Next.js site.

- `resources/Ultimate_React.js_interview_questions_bank_for_30_lpa_packages.pdf` → Part 1, **Question Bank** (sections 01–21)
- `resources/React_Scenario-Based_Questions..pdf` → Part 2, **Scenario-Based** (sections 22–29)

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export of every page
```

## Content layout

```
content/
  07-fiber-and-reconciliation/     <- one folder per section (NN-slug)
    index.md                       <- section title, order, part, description, intro
    01-what-is-react-fiber.md      <- one file per question (NN-slug)
```

Topic frontmatter:

```yaml
---
title: "What is React Fiber?"
asked_as: ["Other phrasing of the same question"]  # optional
tags: ["fiber", "internals"]
difficulty: "medium"   # easy | medium | hard
---
```

The body is GitHub-flavored Markdown starting at `##` headings (`## Short answer`, `## Explanation`, `## Example`, ...). Headings feed the "On this page" menu automatically.

To add a question, drop a new `NN-slug.md` into a section folder. To add a section, add a new `NN-slug/` folder with an `index.md`. No code changes needed.
