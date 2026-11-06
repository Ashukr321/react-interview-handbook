import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import { getSections, getTopic } from "@/lib/content";

type Params = Promise<{ section: string; topic: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getSections().flatMap((s) => s.topics.map((t) => ({ section: s.slug, topic: t.slug })));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { section, topic } = await params;
  const data = getTopic(section, topic);
  return data ? { title: `${data.topic.num}. ${data.topic.title}` } : {};
}

export default async function TopicPage({ params }: { params: Params }) {
  const { section, topic } = await params;
  const data = getTopic(section, topic);
  if (!data) notFound();
  const { section: s, topic: t, body, headings, prev, next } = data;

  return (
    <article className="page">
      {headings.length > 0 && (
        <details className="otp">
          <summary>On this page</summary>
          <ul>
            {headings.map((h) => (
              <li key={h.id} className={h.depth === 3 ? "sub" : ""}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <nav className="crumbs">
        <Link href={`/${s.slug}`}>
          Section {s.num}: {s.title}
        </Link>{" "}
        › {t.num}
      </nav>
      <h1>
        <span className="accent">{t.num}.</span> {t.title}
      </h1>
      <div className="badges">
        <span className="badge">📄 Notes</span>
        {t.difficulty && <span className={`badge diff diff-${t.difficulty}`}>{t.difficulty}</span>}
        {t.tags.map((tag) => (
          <span key={tag} className="badge tag">
            #{tag}
          </span>
        ))}
      </div>
      {t.askedAs.length > 0 && (
        <div className="asked-as">
          <strong>Also asked as:</strong>
          <ul>
            {t.askedAs.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      <hr />

      <Markdown>{body}</Markdown>

      <nav className="pager">
        {prev ? (
          <Link href={`/${prev.section.slug}/${prev.topic.slug}`} className="pager-link">
            <span className="muted">← Previous</span>
            <span>{prev.topic.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/${next.section.slug}/${next.topic.slug}`} className="pager-link next">
            <span className="muted">Next →</span>
            <span>{next.topic.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
