import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";

async function getApiBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("host");
    if (host) return `${proto}://${host}`;
  } catch {
    // ignore
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  return "http://localhost:3000";
}

async function fetchAnalysis(url: string) {
const base = await getApiBaseUrl();
  const res = await fetch(`${base}/api/analyze?url=${encodeURIComponent(url)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to analyze URL");
  }
  return res.json();
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-2 text-xs text-slate-200">{children}</div>
    </section>
  );
}

function Recommendation({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-slate-900/80 p-3 text-xs text-slate-200 ring-1 ring-slate-800">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Recommendation
      </div>
      <div className="mt-1 text-xs font-medium text-slate-100">{label}</div>
      <div className="mt-1 text-[11px] text-slate-300">{children}</div>
    </div>
  );
}

type Suggestion = { label: string; body: React.ReactNode };
type AnalyzeData = Awaited<ReturnType<typeof fetchAnalysis>>;

function buildSuggestions(data: AnalyzeData): Suggestion[] {
  const suggestions: Suggestion[] = [];
  if (!data.sitemap.found) {
    suggestions.push({
      label: "Create a sitemap",
      body: (
        <>
          No sitemap.xml was detected. Use our <Link href="/tools/sitemap" className="text-indigo-400 hover:text-indigo-300">Sitemap Generator</Link>{" "}
          to build one and upload it to your site root.
        </>
      ),
    });
  }
  if (!data.robots.found) {
    suggestions.push({
      label: "Publish a robots.txt",
      body: (
        <>
          No robots.txt detected. Use our <Link href="/tools/robots" className="text-indigo-400 hover:text-indigo-300">robots.txt Generator</Link>{" "}
          to create one.
        </>
      ),
    });
  }
  if (!data.llms.llmsTxtFound) {
    suggestions.push({
      label: "Add an llms.txt file",
      body: (
        <>
          No llms.txt found. Use our <Link href="/tools/llms" className="text-indigo-400 hover:text-indigo-300">llms.txt Generator</Link>{" "}
          to help AI agents discover your content.
        </>
      ),
    });
  }
  if (!data.schema.present) {
    suggestions.push({
      label: "Add structured data",
      body: (
        <>
          No JSON-LD schema detected. Use our <Link href="/tools/schema" className="text-indigo-400 hover:text-indigo-300">Schema Generator</Link>{" "}
          to add schema markup.
        </>
      ),
    });
  }
  return suggestions;
}

async function AnalyzedView({ url }: { url: string }) {
  const data = await fetchAnalysis(url);
  const suggestions = buildSuggestions(data);
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-slate-900/60 p-5 ring-1 ring-slate-800">
        <h2 className="text-sm font-semibold">BIGSEO Assistant Checklist</h2>
        <p className="mt-1 text-xs text-slate-300">
          Based on the URL below, here are the recommended fixes.
        </p>
        <p className="mt-2 rounded bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100">
          {url}
        </p>
        {suggestions.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3">
            {suggestions.map((s) => (
              <Recommendation key={s.label} label={s.label}>
                {s.body}
              </Recommendation>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded bg-emerald-900/20 p-3 text-xs text-emerald-300 ring-1 ring-emerald-800">
            All checks passed. Your site looks good from a technical SEO standpoint.
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Page status">
          <div>HTTP status: <span className={data.page.status >= 200 && data.page.status < 400 ? "text-emerald-400" : "text-rose-400"}>{data.page.status}</span></div>
          <div>Reachable: {data.page.reachable ? "Yes" : "No"}</div>
          {data.page.title && <div>Title: {data.page.title}</div>}
          {data.page.description && <div>Description: {data.page.description}</div>}
          {data.page.canonical && <div>Canonical: {data.page.canonical}</div>}
        </Card>

        <Card title="robots.txt">
          <div>Found: {data.robots.found ? "Yes" : "No"}</div>
          <div>URL: {data.robots.url}</div>
          {data.robots.allowsGooglebot !== undefined && (
            <div>Googlebot allowed: {data.robots.allowsGooglebot ? "Yes" : "No"}</div>
          )}
          {data.robots.allowsGptBot !== undefined && (
            <div>GPTBot allowed: {data.robots.allowsGptBot ? "Yes" : "No"}</div>
          )}
          {data.robots.allowsClaudeBot !== undefined && (
            <div>ClaudeBot allowed: {data.robots.allowsClaudeBot ? "Yes" : "No"}</div>
          )}
          {data.robots.allowsPerplexityBot !== undefined && (
            <div>PerplexityBot allowed: {data.robots.allowsPerplexityBot ? "Yes" : "No"}</div>
          )}
          {data.robots.sitemapUrls.length > 0 && (
            <div>Sitemaps in robots: {data.robots.sitemapUrls.join(", ")}</div>
          )}
        </Card>

        <Card title="Sitemap">
          <div>Found: {data.sitemap.found ? "Yes" : "No"}</div>
          {data.sitemap.primarySitemapUrl && (
            <div>Primary: {data.sitemap.primarySitemapUrl}</div>
          )}
          {data.sitemap.urlCount !== undefined && (
            <div>Estimated URL count: {data.sitemap.urlCount}</div>
          )}
        </Card>

        <Card title="llms.txt">
          <div>llms.txt: {data.llms.llmsTxtFound ? "Found" : "Missing"}</div>
          <div>llms-full.txt: {data.llms.llmsFullTxtFound ? "Found" : "Missing"}</div>
          {data.llms.llmsTxtFound && <div>URL: {data.llms.llmsTxtUrl}</div>}
          {data.llms.llmsFullTxtFound && <div>URL: {data.llms.llmsFullTxtUrl}</div>}
        </Card>

        <Card title="Schema (JSON-LD)">
          <div>Present: {data.schema.present ? "Yes" : "No"}</div>
          {data.schema.types.length > 0 && (
            <div>Types: {data.schema.types.join(", ")}</div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: { url?: string };
}) {
  const url = searchParams.url;
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-200">
          &larr; Back
        </Link>
        {!url ? (
          <p className="text-sm text-slate-300">
            No URL provided. Go back and submit a URL to analyze.
          </p>
        ) : (
          <Suspense fallback={<p className="text-sm">Running checks...</p>}>
            <AnalyzedView url={url} />
          </Suspense>
        )}
      </div>
    </main>
  );
}
