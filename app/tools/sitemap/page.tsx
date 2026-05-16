"use client";

import { useState } from "react";

type SitemapEntry = {
  id: string;
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
};

const CHANGEFREQ_OPTIONS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];
const today = new Date().toISOString().slice(0, 10);

function uid() {
  return Math.random().toString(36).slice(2);
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .filter((e) => e.loc.trim().length > 0)
    .map((e) => {
      const parts = [
        `<loc>${e.loc.trim()}</loc>`,
        e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : "",
        `<changefreq>${e.changefreq || "weekly"}</changefreq>`,
        `<priority>${e.priority || "0.5"}</priority>`,
      ].filter(Boolean);
      return `<url>\n    ${parts.join("\n    ")}\n  </url>`;
    })
    .join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls}\n</urlset>`;
}

function makeEntry(loc = "", changefreq = "weekly", priority = "0.5"): SitemapEntry {
  return { id: uid(), loc, lastmod: today, changefreq, priority };
}

export default function SitemapToolPage() {
  const [mode, setMode] = useState<"crawl" | "manual">("crawl");

  // Crawl mode
  const [domain, setDomain] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState("");

  // Shared state
  const [entries, setEntries] = useState<SitemapEntry[]>([]);
  const [xml, setXml] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Manual textarea
  const [textarea, setTextarea] = useState("");

  async function handleCrawl() {
    if (!domain.trim()) return;
    setCrawling(true);
    setCrawlError("");
    setEntries([]);
    setXml(null);
    try {
      const res = await fetch("/api/crawl-sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Crawl failed");
      const crawled: SitemapEntry[] = (data.urls as string[]).map((url) => makeEntry(url));
      setEntries(crawled);
    } catch (err: unknown) {
      setCrawlError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCrawling(false);
    }
  }

  function handleLoadManual() {
    const lines = textarea
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    setEntries(lines.map((loc) => makeEntry(loc)));
    setXml(null);
  }

  function updateEntry(id: string, field: keyof SitemapEntry, value: string) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    setXml(null);
  }

  function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setXml(null);
  }

  function addRow() {
    setEntries((prev) => [...prev, makeEntry()]);
  }

  function handleGenerate() {
    setXml(buildSitemapXml(entries));
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
    setShowInstructions(true);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-16 flex flex-col gap-8">
        <header>
          <h1 className="text-2xl font-semibold">Sitemap Generator</h1>
          <p className="mt-2 text-sm text-slate-300">
            Auto-crawl your domain to discover all pages, edit the results, generate and download a valid XML sitemap.
          </p>
        </header>

        {/* Mode tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("crawl")}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              mode === "crawl"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            🔍 Crawl Domain
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              mode === "manual"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            ✏️ Paste URLs
          </button>
        </div>

        {/* Crawl mode input */}
        {mode === "crawl" && (
          <section className="rounded-xl bg-slate-900/60 p-5 ring-1 ring-slate-800 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">Enter your domain</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500"
                  placeholder="https://example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
                />
                <button
                  onClick={handleCrawl}
                  disabled={crawling || !domain.trim()}
                  className="rounded-md bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                >
                  {crawling ? "Crawling…" : "Crawl Site"}
                </button>
              </div>
              {crawling && (
                <p className="mt-2 text-xs text-indigo-400 animate-pulse">
                  Crawling pages — this may take 15–30 seconds for larger sites…
                </p>
              )}
              {crawlError && (
                <p className="mt-2 text-xs text-red-400">Error: {crawlError}</p>
              )}
            </div>
            <p className="text-xs text-slate-400">
              The crawler follows internal links up to 3 levels deep and discovers up to 200 pages. All pages are added to the editor below where you can tweak them before generating.
            </p>
          </section>
        )}

        {/* Manual paste mode */}
        {mode === "manual" && (
          <section className="rounded-xl bg-slate-900/60 p-5 ring-1 ring-slate-800 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">URLs (one per line)</label>
              <textarea
                className="w-full h-36 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500"
                placeholder="https://example.com/\nhttps://example.com/about\nhttps://example.com/contact"
                value={textarea}
                onChange={(e) => setTextarea(e.target.value)}
              />
            </div>
            <button
              onClick={handleLoadManual}
              className="self-start rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Load into Editor
            </button>
          </section>
        )}

        {/* Editor table */}
        {entries.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">
                Editor <span className="text-slate-500 font-normal">({entries.length} URLs)</span>
              </h2>
              <button
                onClick={addRow}
                className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-700 rounded px-2 py-1"
              >
                + Add row
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl ring-1 ring-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">URL</th>
                    <th className="text-left px-3 py-2 font-medium w-32">Last Modified</th>
                    <th className="text-left px-3 py-2 font-medium w-28">Change Freq</th>
                    <th className="text-left px-3 py-2 font-medium w-20">Priority</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className={`border-t border-slate-800 ${
                        i % 2 === 0 ? "bg-slate-950" : "bg-slate-900/40"
                      }`}
                    >
                      <td className="px-3 py-1.5">
                        <input
                          className="w-full bg-transparent text-slate-100 outline-none focus:underline placeholder:text-slate-600"
                          value={entry.loc}
                          onChange={(e) => updateEntry(entry.id, "loc", e.target.value)}
                          placeholder="https://"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="date"
                          className="bg-transparent text-slate-300 outline-none w-full"
                          value={entry.lastmod}
                          onChange={(e) => updateEntry(entry.id, "lastmod", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <select
                          className="bg-slate-950 text-slate-300 rounded border border-slate-700 px-1 py-0.5 text-xs w-full"
                          value={entry.changefreq}
                          onChange={(e) => updateEntry(entry.id, "changefreq", e.target.value)}
                        >
                          {CHANGEFREQ_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          className="w-full bg-transparent text-slate-300 outline-none"
                          value={entry.priority}
                          onChange={(e) => updateEntry(entry.id, "priority", e.target.value)}
                          placeholder="0.5"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="text-slate-600 hover:text-red-400 text-base"
                          title="Remove"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                className="rounded-md bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Generate XML
              </button>
              {xml && (
                <button
                  onClick={handleDownload}
                  className="rounded-md border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800"
                >
                  ⬇ Download sitemap.xml
                </button>
              )}
            </div>

            {xml && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">XML Preview</label>
                <pre className="max-h-64 overflow-auto rounded-md bg-slate-950 px-3 py-2 text-[11px] text-slate-300 ring-1 ring-slate-800">
                  {xml}
                </pre>
              </div>
            )}
          </section>
        )}

        {/* Deployment instructions */}
        {showInstructions && (
          <section className="rounded-xl bg-slate-900/60 p-5 ring-1 ring-slate-700">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">📋 How to deploy your sitemap.xml</h2>
            <div className="grid gap-4 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-950 ring-1 ring-slate-800">
                <p className="font-semibold text-slate-100 mb-1">WordPress (no SEO plugin)</p>
                <p>Upload <code className="font-mono text-indigo-300">sitemap.xml</code> to your site root via FTP or File Manager. Access it at <code className="font-mono text-indigo-300">https://yourdomain.com/sitemap.xml</code>.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 ring-1 ring-slate-800">
                <p className="font-semibold text-slate-100 mb-1">WordPress (Yoast / RankMath)</p>
                <p>These plugins already generate dynamic sitemaps. Use this file as a reference or supplement only — do not replace the plugin&apos;s sitemap to avoid conflicts.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 ring-1 ring-slate-800">
                <p className="font-semibold text-slate-100 mb-1">React / Next.js / SPA</p>
                <p>Place <code className="font-mono text-indigo-300">sitemap.xml</code> inside the <code className="font-mono text-indigo-300">public/</code> folder. It will be served from the root path automatically.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 ring-1 ring-slate-800">
                <p className="font-semibold text-slate-100 mb-1">PHP / Custom server</p>
                <p>Place the file in your web root (same folder as <code className="font-mono text-indigo-300">index.php</code>). Ensure your server serves <code className="font-mono text-indigo-300">.xml</code> files with <code className="font-mono text-indigo-300">Content-Type: application/xml</code>.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 ring-1 ring-slate-800">
                <p className="font-semibold text-slate-100 mb-1">After uploading</p>
                <p>Add <code className="font-mono text-indigo-300">Sitemap: https://yourdomain.com/sitemap.xml</code> to your <code className="font-mono text-indigo-300">robots.txt</code> file, then submit the sitemap URL in Google Search Console.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
