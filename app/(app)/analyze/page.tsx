import { Suspense } from "react";
import Link from "next/link";

async function fetchAnalysis(url: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/analyze?url=${encodeURIComponent(
      url,
    )}`,
    {
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error("Failed to analyze URL");
  }

  return res.json();
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
          No sitemap.xml was detected. Generate one from your key URLs in the
          <Link href="/tools/sitemap" className="text-indigo-400 hover:text-indigo-300">
            {" "}
            Sitemap Generator
          </Link>{" "}
          and upload it to your site root. Then reference it in robots.txt.
        </>
      ),
    });
  }

  if (!data.robots.found) {
    suggestions.push({
      label: "Publish a robots.txt",
      body: (
        <>
          There is no robots.txt at this origin. Use the
          <Link href="/tools/robots" className="text-indigo-400 hover:text-indigo-300">
            {" "}
            robots.txt Generator
          </Link>{" "}
          to create one that allows crawling of public pages and references your sitemap.
        </>
      ),
    });
  }

  if (!data.llms.llmsTxtFound) {
    suggestions.push({
      label: "Expose an llms.txt index",
      body: (
        <>
          We could not find an llms.txt file. Build one using the
          <Link href="/tools/llms" className="text-indigo-400 hover:text-indigo-300">
            {" "}
            llms.txt Generator
          </Link>{" "}
          to highlight your most important docs and resources for AI assistants.
        </>
      ),
    });
  }

  if (!data.schema.present) {
    suggestions.push({
      label: "Add structured data",
      body: (
        <>
          No JSON-LD schema was detected. Use the
          <Link href="/tools/schema" className="text-indigo-400 hover:text-indigo-300">
            {" "}
            Schema Generator
          </Link>{" "}
          to create Article, Organization, or FAQ markup and embed it on key templates.
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
      <div className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
        <h1 className="text-sm font-semibold text-slate-100">
          BIGSEO Assistant Checklist
        </h1>
        <p className="mt-1 text-xs text-slate-300">
          Based on the URL you provided, here is a quick technical SEO checklist and
          shortcuts to the tools that can fix each gap.
        </p>
        <p className="mt-2 text-[11px] text-slate-400">
          URL: <span className="font-mono text-slate-200">{url}</span>
        </p>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-3">
          {suggestions.map((s, idx) => (
            <Recommendation key={idx} label={s.label}>
              {s.body}
            </Recommendation>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Page">
          <p>Status: {data.page.status}</p>
          <p>Reachable: {String(data.page.reachable)}</p>
          {data.page.title && <p>Title: {data.page.title}</p>}
          {data.page.description && <p>Description: {data.page.description}</p>}
          {data.page.canonical && <p>Canonical: {data.page.canonical}</p>}
        </Card>

        <Card title="robots.txt">
          <p>Found: {String(data.robots.found)}</p>
          <p>URL: {data.robots.url}</p>
          <p>Allows Googlebot: {String(data.robots.allowsGooglebot)}</p>
          <p>Allows GPTBot: {String(data.robots.allowsGptBot)}</p>
          <p>Allows ClaudeBot: {String(data.robots.allowsClaudeBot)}</p>
          <p>Allows PerplexityBot: {String(data.robots.allowsPerplexityBot)}</p>
          {data.robots.sitemapUrls?.length > 0 && (
            <p>Sitemaps in robots: {data.robots.sitemapUrls.join(", ")}</p>
          )}
        </Card>

        <Card title="Sitemap">
          <p>Found: {String(data.sitemap.found)}</p>
          {data.sitemap.primarySitemapUrl && (
            <p>Primary sitemap URL: {data.sitemap.primarySitemapUrl}</p>
          )}
          {typeof data.sitemap.urlCount === "number" && (
            <p>Estimated URL count: {data.sitemap.urlCount}</p>
          )}
        </Card>

        <Card title="llms.txt">
          <p>
            llms.txt: {String(data.llms.llmsTxtFound)} ({data.llms.llmsTxtUrl})
          </p>
          <p>
            llms-full.txt: {String(data.llms.llmsFullTxtFound)} (
            {data.llms.llmsFullTxtUrl})
          </p>
        </Card>

        <Card title="Schema (JSON-LD)">
          <p>Present: {String(data.schema.present)}</p>
          {data.schema.types?.length > 0 && (
            <p>Types: {data.schema.types.join(", ")}</p>
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
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          ← Back
        </Link>
        {!url ? (
          <p className="text-sm text-slate-300">
            No URL provided. Go back and submit a URL to analyze.
          </p>
        ) : (
          <Suspense fallback={<p className="text-sm">Running checks…</p>}>
            {/* @ts-expect-error Async Server Component */}
            <AnalyzedView url={url} />
          </Suspense>
        )}
      </div>
    </main>
  );
}
