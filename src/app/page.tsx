import Link from "next/link";
import { getSections } from "@/lib/content";

export default function Home() {
  const sections = getSections();
  const parts = [...new Set(sections.map((s) => s.part))];
  const total = sections.reduce((n, s) => n + s.topics.length, 0);

  return (
    <article className="page">
      <details className="otp">
        <summary>On this page</summary>
        <ul>
          {parts.map((p) => (
            <li key={p}>
              <a href={`#${p.toLowerCase().replace(/\W+/g, "-")}`}>{p}</a>
            </li>
          ))}
        </ul>
      </details>

      <section className="hero">
        <svg className="hero-atom" viewBox="-60 -60 120 120" aria-hidden>
          <circle r="9" fill="currentColor" />
          {[0, 60, 120].map((deg) => (
            <ellipse key={deg} rx="50" ry="19" fill="none" stroke="currentColor" strokeWidth="4" transform={`rotate(${deg})`} />
          ))}
        </svg>
        <div>
          <div className="hero-badge">
            {sections.length} sections · {total} questions
          </div>
          <h2 className="hero-title">
            React Interview <span>Handbook</span>
          </h2>
          <p className="hero-sub">From fundamentals to Fiber internals, performance and real production scenarios.</p>
          <div className="chips">
            {["JSX", "Hooks", "State", "Fiber", "Concurrency", "Suspense", "Redux", "Security", "Perf"].map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <h1>React Interview Handbook</h1>
      <hr />
      <p className="lead">
        <strong>Every question from both interview banks, answered in plain English with React code.</strong> Each answer
        gives you a short reply you can say out loud, a deeper explanation, an example, common mistakes and follow-up
        questions.
      </p>
      <div className="stats">
        <span>{sections.length} sections</span>
        <span>{total} questions</span>
        <span>{parts.length} parts</span>
      </div>

      <div className="callout">
        <div className="callout-title">🚀 How to use this handbook</div>
        <ul>
          <li>
            <strong>Question Bank</strong> covers concepts from React basics to internals. Go through it in order.
          </li>
          <li>
            <strong>Scenario-Based</strong> covers &quot;what would you do if...&quot; questions: root cause, fix and how to verify it.
          </li>
          <li>
            Press <kbd>/</kbd> anywhere to search all questions.
          </li>
        </ul>
      </div>

      {parts.map((part) => (
        <section key={part}>
          <h2 id={part.toLowerCase().replace(/\W+/g, "-")}>{part}</h2>
          <div className="path">
            {sections
              .filter((s) => s.part === part)
              .map((s) => (
                <div key={s.slug} className="path-section">
                  <Link href={`/${s.slug}`} className="path-head">
                    <span className="eyebrow">Section {s.num}</span>
                    <span className="path-title">{s.title}</span>
                    <span className="muted">{s.topics.length} questions</span>
                  </Link>
                  <ol className="path-topics">
                    {s.topics.map((t) => (
                      <li key={t.slug}>
                        <Link href={`/${s.slug}/${t.slug}`}>
                          <span className="num">{t.num}</span>
                          {t.title}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
          </div>
        </section>
      ))}
    </article>
  );
}
