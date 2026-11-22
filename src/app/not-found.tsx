import Link from "next/link";

export default function NotFound() {
  return (
    <article className="page">
      <h1>Page not found</h1>
      <p className="lead">That question doesn&apos;t exist (yet). Try the search box, or start from the top.</p>
      <p>
        <Link href="/" className="accent">
          ← Back to the handbook
        </Link>
      </p>
    </article>
  );
}
