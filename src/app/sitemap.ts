import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://mapma.org";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contribute`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/upload`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
