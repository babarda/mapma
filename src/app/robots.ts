import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Don't index API endpoints or per-user/auth pages.
      disallow: ["/api/", "/profile", "/login", "/signup"],
    },
    sitemap: "https://mapma.org/sitemap.xml",
    host: "https://mapma.org",
  };
}
