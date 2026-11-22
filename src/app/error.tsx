"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <article className="page">
      <h1>Something went wrong</h1>
      <p className="lead">This page failed to load. It may be a network hiccup.</p>
      <p>
        <button type="button" className="menu-btn accent" onClick={reset}>
          Try again
        </button>{" "}
        ·{" "}
        <Link href="/" className="accent">
          Back to the handbook
        </Link>
      </p>
    </article>
  );
}
