import { Suspense } from "react";

function AnalyzedView({ url }: { url: string }) {
  return (
    <div className="rounded-xl bg-slate-900/60 p-6 ring-1 ring-slate-800">
      <h1 className="text-xl font-semibold">Analysis (coming soon)</h1>
      <p className="mt-2 text-sm text-slate-300">
        We will run sitemap, robots.txt, schema, and llms.txt checks for:
      </p>
      <p className="mt-3 rounded bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100">
        {url}
      </p>
    </div>
  );
}

export default function AnalyzePage({
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
        <Suspense fallback={<p className="text-sm">Loading</p>}>
          {url ? (
            <AnalyzedView url={url} />
          ) : (
            <p className="text-sm text-slate-300">
              No URL provided. Go back and submit a URL to analyze.
            </p>
          )}
        </Suspense>
      </div>
    </main>
  );
}
