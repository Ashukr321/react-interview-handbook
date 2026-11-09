import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import { getSection, getSections } from "@/lib/content";
import { OG_IMAGES } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSections().map((s) => ({ section: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const s = getSection((await params).section);
  if (!s) return {};
  const url = `/${s.slug}`;
  return {
    title: `${s.title} Interview Questions`,
    description: s.description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: s.title, description: s.description, url, images: OG_IMAGES },
  };
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const s = getSection((await params).section);
  if (!s) notFound();

  return (
    <article className="page">
      <nav className="crumbs">
        <Link href="/">Home</Link> › Section {s.num}
      </nav>
      <div className="eyebrow">
        {s.part} · Section {s.num}
      </div>
      <h1>{s.title}</h1>
      <p className="muted">
        {s.topics.length} questions. {s.description}
      </p>
      {s.intro && <Markdown>{s.intro}</Markdown>}

      <div className="cards">
        {s.topics.map((t) => (
          <Link key={t.slug} href={`/${s.slug}/${t.slug}`} className="card">
            <span className="num">{t.num}</span>
            <span className="card-body">
              <span className="card-title">{t.title}</span>
              <span className="card-meta">
                📄 Notes{t.difficulty && <span className={`diff diff-${t.difficulty}`}>{t.difficulty}</span>}
              </span>
            </span>
            <span className="arrow" aria-hidden>
              →
            </span>
          </Link>
        ))}
      </div>
    </article>
  );
}
