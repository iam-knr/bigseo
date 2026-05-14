"use client";

import { useState } from "react";

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

const defaultChangefreq = "weekly";
const defaultPriority = "0.5";

function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .filter((e) => e.loc.trim().length > 0)
    .map((entry) => {
      const loc = entry.loc.trim();
      const lastmod = entry.lastmod?.trim();
      const changefreq = entry.changefreq?.trim() || defaultChangefreq;
      const priority = entry.priority?.trim() || defaultPriority;

      const parts = [
        `<loc>${loc}</loc>`,
        lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
        changefreq ? `<changefreq>${changefreq}</changefreq>` : "",
        priority ? `<priority>${priority}</priority>` : "",
      ].filter(Boolean);

      return `<url>${parts.join("")}</url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export default function SitemapToolPage() {
  const [textarea, setTextarea] = useState("");
  const [changefreq, setChangefreq] = useState(defaultChangefreq);
  const [priority, setPriority] = useState(defaultPriority);
  const [xml, setXml] = useState<string | null>(null);

  function handleGenerate() {
    const lines = textarea
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const entries: SitemapEntry[] = lines.map((loc) => ({
      loc,
      changefreq,
      priority,
    }));

    const xmlString = buildSitemapXml(entries);
    setXml(xmlString);
  }

  function handleDownload() {
    if (!xml) return;
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-16 flex flex-col gap-8">
        <header>
          <h1 className="text-2xl font-semibold">Sitemap Generator</h1>
          <p className="mt-2 text-sm text-slate-300">
            Paste URLs, choose defaults, generate a valid XML sitemap, and download it.
          </p>
        </header>

        <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-200">
              URLs (one per line)
            </label>
            <textarea
              className="mt-1 h-40 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500"
              placeholder="https://example.com/\nhttps://example.com/about\nhttps://example.com/contact"
              value={textarea}
              onChange={(e) => setTextarea(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <label className="block text-xs font-medium text-slate-200">
                Default changefreq
              </label>
              <select
                className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                value={changefreq}
                onChange={(e) => setChangefreq(e.target.value)}
              >
                <option value="always">always</option>
                <option value="hourly">hourly</option>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
                <option value="yearly">yearly</option>
                <option value="never">never</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200">
                Default priority
              </label>
              <input
                type="text"
                className="mt-1 w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 text-xs">
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-md bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400"
            >
              Generate sitemap
            </button>
            {xml && (
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-md border border-slate-600 px-4 py-2 font-semibold text-slate-100 hover:bg-slate-800"
              >
                Download sitemap.xml
              </button>
            )}
          </div>

          {xml && (
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-200">
                Preview
              </label>
              <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-slate-950 px-3 py-2 text-[11px] text-slate-100">
                {xml}
              </pre>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 text-xs text-slate-200">
          <h2 className="text-sm font-semibold">How to use this sitemap</h2>
          <p className="mt-2">
            After downloading <code className="font-mono">sitemap.xml</code>, upload it to the web root of your
            site so it is available at <code className="font-mono">https://yourdomain.com/sitemap.xml</code>.
          </p>
          <p className="mt-2">
            On WordPress, you typically rely on SEO plugins (Yoast, RankMath, etc.) for dynamic sitemaps. If you
            use this static file, disable conflicting sitemap features and place the file in the site root.
          </p>
          <p className="mt-2">
            On React/Next.js or other SPA setups, put the file into your <code className="font-mono">public/</code> folder so it is
            served from the root path. For custom PHP or frameworks, place the file at the web server document root
            and ensure it is publicly accessible.
          </p>
        </section>
      </div>
    </main>
  );
}
