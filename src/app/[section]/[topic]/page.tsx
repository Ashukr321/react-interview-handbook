import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import { getSections, getTopic } from "@/lib/content";
import { OG_IMAGES, SITE_NAME, SITE_URL, jsonLd } from "@/lib/site";

type Params = Promise<{ section: string; topic: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getSections().flatMap((s) => s.topics.map((t) => ({ section: s.slug, topic: t.slug })));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { section, topic } = await params;
  const data = getTopic(section, topic);
  if (!data) return {};
  const { topic: t, section: s } = data;
  const url = `/${s.slug}/${t.slug}`;
  return {
    title: t.title,
    description: t.summary,
    keywords: t.tags,
    alternates: { canonical: url },
    openGraph: { type: "article", title: t.title, description: t.summary, url, section: s.title, tags: t.tags, images: OG_IMAGES },
    twitter: { card: "summary_large_image", title: t.title, description: t.summary, images: OG_IMAGES },
  };
}

export default async function TopicPage({ params }: { params: Params }) {
  const { section, topic } = await params;
  const data = getTopic(section, topic);
  if (!data) notFound();
  const { section: s, topic: t, body, headings, prev, next } = data;

  const url = `${SITE_URL}/${s.slug}/${t.slug}`;
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: t.title,
      description: t.summary,
      url,
      keywords: t.tags.join(", "),
      articleSection: s.title,
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: s.title, item: `${SITE_URL}/${s.slug}` },
        { "@type": "ListItem", position: 3, name: t.title, item: url },
      ],
    },
  ];

  return (
    <article className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
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
