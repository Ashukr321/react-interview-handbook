export const SITE_NAME = "React Interview Handbook";
export const SITE_DESCRIPTION =
  "300+ React interview questions answered in plain English with code: fundamentals, hooks, Fiber internals, concurrency, Suspense, Redux, performance, security and real-world scenarios.";

// Vercel sets VERCEL_PROJECT_PRODUCTION_URL at build time; NEXT_PUBLIC_SITE_URL overrides it (e.g. a custom domain).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

// Child pages that set their own openGraph/twitter don't inherit the root opengraph-image, so they reference it.
export const OG_IMAGES = [{ url: "/opengraph-image", width: 1200, height: 630, alt: "React Interview Handbook" }];

/** Safe JSON for <script type="application/ld+json"> (no "</script>" breakout). */
export const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
