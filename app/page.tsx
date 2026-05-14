export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-16">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">BIGSEO</h1>
          <p className="mt-2 text-sm text-slate-300">
            Free technical SEO assistant for sitemaps, robots.txt, schema &amp;
            llms.txt.
          </p>
        </header>

        <section className="rounded-xl bg-slate-900/60 p-6 ring-1 ring-slate-800">
          <h2 className="text-lg font-semibold">Analyze a URL</h2>
          <p className="mt-1 text-sm text-slate-300">
            Paste any page URL to get a quick overview of sitemaps, robots.txt,
            schema, and llms.txt (coming soon).
          </p>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" action="/analyze">
            <input
              name="url"
              type="url"
              required
              placeholder="https://www.example.com/page"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-indigo-500"
            />
            <button
              type="submit"
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Analyze
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
