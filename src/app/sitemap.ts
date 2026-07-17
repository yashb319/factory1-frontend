import type { MetadataRoute } from "next";

const baseUrl = "https://www.factory1.in";
const lastModified = new Date("2026-07-10");

const routes = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "/help-center", changeFrequency: "monthly", priority: 0.7 },
  { path: "/documentation", changeFrequency: "monthly", priority: 0.7 },
  { path: "/api-info", changeFrequency: "monthly", priority: 0.6 },
  { path: "/status", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.5 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.5 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/security-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/acceptable-use-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/ai-usage-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/data-processing-agreement", changeFrequency: "yearly", priority: 0.4 },
  { path: "/data-retention-deletion-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/service-level-agreement", changeFrequency: "yearly", priority: 0.4 },
  { path: "/refund-cancellation-policy", changeFrequency: "yearly", priority: 0.4 },
] satisfies Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}>;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
