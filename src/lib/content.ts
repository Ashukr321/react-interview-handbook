import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type TopicMeta = {
  slug: string;
  num: string;
  title: string;
  summary: string;
  difficulty?: "easy" | "medium" | "hard";
  tags: string[];
  askedAs: string[];
};

export type Section = {
  slug: string;
  num: string;
  title: string;
  order: number;
  part: string;
  description: string;
  intro: string;
  topics: TopicMeta[];
};

export type Heading = { depth: 2 | 3; text: string; id: string };

// "07-fiber-and-reconciliation" -> "07"
const numOf = (slug: string) => slug.split("-")[0];
const isNumbered = (name: string) => /^\d{2}-[a-z0-9-]+$/.test(name);

let cache: Section[] | null = null;

export function getSections(): Section[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const dirs = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && isNumbered(d.name))
    .map((d) => d.name)
    .sort();

  cache = dirs.map((slug) => {
    const dir = path.join(CONTENT_DIR, slug);
    const index = path.join(dir, "index.md");
    const { data, content } = fs.existsSync(index)
      ? matter(fs.readFileSync(index, "utf8"))
      : { data: {} as Record<string, unknown>, content: "" };

    const topics = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md") && isNumbered(f.slice(0, -3)))
      .sort()
      .map((file) => {
        const topicSlug = file.slice(0, -3);
        const { data: fm, content: body } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
        return {
          slug: topicSlug,
          num: numOf(topicSlug),
          title: String(fm.title ?? topicSlug),
          summary: summarize(body),
          difficulty: fm.difficulty,
          tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
          askedAs: Array.isArray(fm.asked_as) ? fm.asked_as.map(String) : [],
        } satisfies TopicMeta;
      });

    return {
      slug,
      num: numOf(slug),
      title: String(data.title ?? slug),
      order: Number(data.order ?? numOf(slug)),
      part: String(data.part ?? "Question Bank"),
      description: String(data.description ?? ""),
      intro: content.trim(),
      topics,
    };
  });
  return cache;
}

export function getSection(slug: string) {
  return getSections().find((s) => s.slug === slug);
}

export function getTopic(sectionSlug: string, topicSlug: string) {
  const section = getSection(sectionSlug);
  const index = section?.topics.findIndex((t) => t.slug === topicSlug) ?? -1;
  if (!section || index < 0) return null;

  const raw = fs.readFileSync(path.join(CONTENT_DIR, sectionSlug, `${topicSlug}.md`), "utf8");
  const body = matter(raw).content;

  // Flat list of every topic, used for prev/next across section boundaries.
  const flat = getSections().flatMap((s) => s.topics.map((t) => ({ section: s, topic: t })));
  const pos = flat.findIndex((f) => f.section.slug === sectionSlug && f.topic.slug === topicSlug);

  return {
    section,
    topic: section.topics[index],
    body,
    headings: extractHeadings(body),
    prev: flat[pos - 1] ?? null,
    next: flat[pos + 1] ?? null,
  };
}

/** First paragraph of the body as plain text, cut to ~160 chars for meta descriptions. */
export function summarize(md: string, max = 160) {
  const para =
    md
      .replace(/```[\s\S]*?```/g, "")
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .find((p) => p && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith(">")) ?? "";
  const text = para
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= max ? text : `${text.slice(0, text.lastIndexOf(" ", max - 1))}…`;
}

/** Same ids rehype-slug produces (both use github-slugger), skipping fenced code. */
export function extractHeadings(md: string): Heading[] {
  const slugger = new GithubSlugger();
  const out: Heading[] = [];
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[*_`]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1");
    out.push({ depth: m[1].length as 2 | 3, text, id: slugger.slug(text) });
  }
  return out;
}

export function getSearchIndex() {
  return getSections().flatMap((s) => [
    { href: `/${s.slug}`, title: s.title, context: `${s.part} · Section ${s.num}` },
    ...s.topics.map((t) => ({
      href: `/${s.slug}/${t.slug}`,
      title: t.title,
      context: `${s.num} · ${s.title}`,
      extra: [...t.tags, ...t.askedAs].join(" "),
    })),
  ]);
}

export type SearchItem = ReturnType<typeof getSearchIndex>[number];
