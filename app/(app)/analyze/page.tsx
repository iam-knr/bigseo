import { Suspense } from "react";

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

async function AnalyzedView({ url }: { url: string }) {
  const data = await fetchAnalysis(url);

  return (
    <div className="flex flex-col gap-4">
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
        <a href="/" className="text-xs text-slate-400 hover:text-slate-200">
           Back
        </a>
        {!url ? (
          <p className="text-sm text-slate-300">
            No URL provided. Go back and submit a URL to analyze.
          </p>
        ) : (
          <Suspense fallback={<p className="text-sm">Running checks</p>}>
            {/* @ts-expect-error Async Server Component */}
            <AnalyzedView url={url} />
          </Suspense>
        )}
      </div>
    </main>
  );
}
