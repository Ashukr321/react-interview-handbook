---
title: "What are semantic HTML elements?"
tags: ["html", "semantics", "accessibility", "seo"]
difficulty: "easy"
---

## Short answer

Semantic HTML elements describe the **meaning** of their content, not just how it looks: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`, `<button>`, `<form>`, `<label>`, `<figure>`, `<time>` and so on. Compared with a page of generic `<div>`s and `<span>`s, they give screen readers landmarks and roles for free, help search engines understand structure, provide built-in keyboard behavior, and make code easier to read.

## Explanation

A building with signs ("Exit", "Reception", "Restrooms") is easy to navigate, even for a visitor who cannot see the layout. A building where every door just says "Door" is not. Semantic elements are those signs for browsers, assistive technology and crawlers.

### Common semantic elements

| Element | Meaning | Non-semantic equivalent |
|---|---|---|
| `<header>` | Intro or site/section header | `<div class="header">` |
| `<nav>` | Major navigation links | `<div class="menu">` |
| `<main>` | Primary content (one per page) | `<div id="content">` |
| `<article>` | Self-contained content (post, card) | `<div class="post">` |
| `<section>` | Thematic group, usually with a heading | `<div class="section">` |
| `<aside>` | Related but secondary content | `<div class="sidebar">` |
| `<footer>` | Footer of a page or section | `<div class="footer">` |
| `<button>` | Clickable action | `<div onClick>` |
| `<a href>` | Navigation | `<span onClick>` |
| `<h1>`–`<h6>` | Heading hierarchy | Bold `<div>` |
| `<ul>`/`<ol>`/`<li>` | Lists | Stacked `<div>`s |
| `<figure>`/`<figcaption>`, `<time>`, `<label>`, `<fieldset>`, `<dialog>` | Specific meanings | Custom divs |

### Why it matters

- **Accessibility**: screen readers expose landmarks (jump to `main`, list of headings). `<button>` is focusable and activates on Enter and Space without any extra code.
- **SEO**: crawlers weight headings and main content correctly.
- **Less code**: native elements bring keyboard and focus handling, so you need fewer ARIA attributes. The first rule of ARIA is to use a native element when one exists.
- **Maintainability**: `<nav>` says more to the next developer than `<div className="x12">`.

## Example

```jsx
export function BlogLayout({ posts }) {
  return (
    <>
      <header>
        <nav aria-label="Main">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/blog">Blog</a></li>
          </ul>
        </nav>
      </header>

      <main>
        <h1>Latest posts</h1>
        {posts.map((post) => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <time dateTime={post.date}>{new Date(post.date).toLocaleDateString("en-IN")}</time>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </main>

      <aside aria-label="Newsletter">
        <form>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" />
          <button type="submit">Subscribe</button>
        </form>
      </aside>

      <footer>© 2026 My Blog</footer>
    </>
  );
}
```

## Common mistakes

- `<div onClick>` as a button: not focusable, no keyboard support, no role.
- Skipping heading levels or choosing `<h3>` for its font size; style with CSS instead.
- Wrapping everything in `<section>` without headings, which adds noise rather than meaning.
- Multiple `<main>` elements, or a `<nav>` around every small group of links.

## Follow-up questions

- **`<section>` vs `<article>`?** An `<article>` makes sense on its own (could be syndicated); a `<section>` is a thematic part of something bigger.
- **When do you need ARIA?** When no native element fits, such as tabs, comboboxes or tree views, and then you must also implement keyboard behavior.
- **Does React change anything here?** No. JSX outputs the same HTML; use fragments to avoid unnecessary wrapper `div`s that break structure.

## Quick recap

- Semantic elements describe meaning, not appearance.
- They give accessibility, SEO and keyboard behavior for free.
- Prefer native elements over divs with ARIA.
- Keep a logical heading hierarchy and one `<main>`.
