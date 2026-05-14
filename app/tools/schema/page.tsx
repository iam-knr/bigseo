"use client";

import { useMemo, useState } from "react";

type SchemaType = "Article" | "Organization";

type ArticleForm = {
  headline: string;
  description: string;
  authorName: string;
  url: string;
  imageUrl: string;
  datePublished: string;
};

type OrganizationForm = {
  name: string;
  url: string;
  logo: string;
  sameAs: string;
};

const defaultArticle: ArticleForm = {
  headline: "",
  description: "",
  authorName: "",
  url: "",
  imageUrl: "",
  datePublished: "",
};

const defaultOrganization: OrganizationForm = {
  name: "",
  url: "",
  logo: "",
  sameAs: "",
};

function buildArticleSchema(form: ArticleForm) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: form.headline || undefined,
    description: form.description || undefined,
    author: form.authorName
      ? {
          "@type": "Person",
          name: form.authorName,
        }
      : undefined,
    url: form.url || undefined,
    image: form.imageUrl ? [form.imageUrl] : undefined,
    datePublished: form.datePublished || undefined,
  };
}

function buildOrganizationSchema(form: OrganizationForm) {
  const sameAsArray = form.sameAs
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: form.name || undefined,
    url: form.url || undefined,
    logo: form.logo || undefined,
    sameAs: sameAsArray.length > 0 ? sameAsArray : undefined,
  };
}

export default function SchemaToolPage() {
  const [schemaType, setSchemaType] = useState<SchemaType>("Article");
  const [articleForm, setArticleForm] = useState<ArticleForm>(defaultArticle);
  const [orgForm, setOrgForm] = useState<OrganizationForm>(
    defaultOrganization,
  );

  const jsonLd = useMemo(() => {
    const data =
      schemaType === "Article"
        ? buildArticleSchema(articleForm)
        : buildOrganizationSchema(orgForm);

    // Remove undefined properties recursively
    const cleaned = JSON.parse(JSON.stringify(data));
    return JSON.stringify(cleaned, null, 2);
  }, [schemaType, articleForm, orgForm]);

  function handleCopy() {
    navigator.clipboard.writeText(jsonLd).catch(() => {
      // ignore copy failures
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-16 flex flex-col gap-8">
        <header>
          <h1 className="text-2xl font-semibold">Schema (JSON-LD) Generator</h1>
          <p className="mt-2 text-sm text-slate-300">
            Generate JSON-LD structured data for common types and paste it into your page as
            <code className="ml-1 font-mono">&lt;script type="application/ld+json"&gt;</code>.
          </p>
        </header>

        <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 flex flex-col gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-[11px] font-medium text-slate-200">
              Schema type
            </label>
            <select
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              value={schemaType}
              onChange={(e) => setSchemaType(e.target.value as SchemaType)}
            >
              <option value="Article">Article</option>
              <option value="Organization">Organization</option>
            </select>
          </div>

          {schemaType === "Article" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    Headline
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    value={articleForm.headline}
                    onChange={(e) =>
                      setArticleForm((f) => ({ ...f, headline: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    Description
                  </label>
                  <textarea
                    className="mt-1 h-20 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    value={articleForm.description}
                    onChange={(e) =>
                      setArticleForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    Author name
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    value={articleForm.authorName}
                    onChange={(e) =>
                      setArticleForm((f) => ({
                        ...f,
                        authorName: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    Article URL
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    placeholder="https://example.com/article"
                    value={articleForm.url}
                    onChange={(e) =>
                      setArticleForm((f) => ({ ...f, url: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    Image URL
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    placeholder="https://example.com/image.jpg"
                    value={articleForm.imageUrl}
                    onChange={(e) =>
                      setArticleForm((f) => ({
                        ...f,
                        imageUrl: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    Date published (ISO)
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    placeholder="2024-01-05T08:00:00+08:00"
                    value={articleForm.datePublished}
                    onChange={(e) =>
                      setArticleForm((f) => ({
                        ...f,
                        datePublished: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    Organization name
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    value={orgForm.name}
                    onChange={(e) =>
                      setOrgForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    Website URL
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    placeholder="https://example.com"
                    value={orgForm.url}
                    onChange={(e) =>
                      setOrgForm((f) => ({ ...f, url: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    Logo URL
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    placeholder="https://example.com/logo.png"
                    value={orgForm.logo}
                    onChange={(e) =>
                      setOrgForm((f) => ({ ...f, logo: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300">
                    Social profile URLs (one per line)
                  </label>
                  <textarea
                    className="mt-1 h-20 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    placeholder={"https://twitter.com/brand\nhttps://www.linkedin.com/company/brand"}
                    value={orgForm.sameAs}
                    onChange={(e) =>
                      setOrgForm((f) => ({ ...f, sameAs: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 text-xs text-slate-200 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Generated JSON-LD</h2>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-700"
            >
              Copy JSON-LD
            </button>
          </div>
          <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 px-3 py-2 text-[11px] text-slate-100">
{`<script type="application/ld+json">
${jsonLd}
</script>`}
          </pre>
        </section>

        <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 text-xs text-slate-200">
          <h2 className="text-sm font-semibold">How to implement</h2>
          <p className="mt-2">
            Paste the generated snippet into your page inside the <code className="font-mono">&lt;head&gt;</code> or near the
            relevant content. Most search engines recommend JSON-LD for structured data.
          </p>
          <p className="mt-2">
            On WordPress, you can add this via your theme&apos;s header, a code snippets plugin, or some SEO plugins that
            allow custom schema blocks. On React/Next.js, use <code className="font-mono">next/head</code> or a
            custom <code className="font-mono">&lt;Head&gt;</code> component.
          </p>
          <p className="mt-2">
            After adding schema to your site, validate it using tools like Google&apos;s Rich Results Test or other
            structured data testing tools.
          </p>
        </section>
      </div>
    </main>
  );
}
