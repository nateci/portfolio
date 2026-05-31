import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: "https://natecirino.com/sitemap.xml",
    host: "https://natecirino.com",
  };
}
