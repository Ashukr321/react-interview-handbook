import type { MetadataRoute } from "next";
import { getSections } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...getSections().flatMap((s) => [
      { url: `${SITE_URL}/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.8 },
      ...s.topics.map((t) => ({
        url: `${SITE_URL}/${s.slug}/${t.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ]),
  ];
}
