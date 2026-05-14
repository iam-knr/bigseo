"use client";

import { useState } from "react";

type LlmsLink = {
  title: string;
  url: string;
  description: string;
};

type LlmsSection = {
  heading: string;
  links: LlmsLink[];
};

function buildLlmsTxt({
  siteName,
  summary,
  details,
  sections,
}: {
  siteName: string;
  summary: string;
  details: string;
  sections: LlmsSection[];
}): string {
  const lines: string[] = [];

  if (siteName.trim()) {
    lines.push(`# ${siteName.trim()}`);
  }

  if (summary.trim()) {
    lines.push(`> ${summary.trim()}`);
  }

  if (details.trim()) {
    lines.push("", details.trim());
  }

  sections.forEach((section) => {
    if (!section.heading.trim()) return;
    lines.push("", `## ${section.heading.trim()}`);
    if (!section.links.length) return;
    section.links.forEach((link) => {
      if (!link.url.trim() || !link.title.trim()) return;
      const desc = link.description.trim();
      const base = `- [${link.title.trim()}](${link.url.trim()})`;
      lines.push(desc ? `${base}: ${desc}` : base);
    });
  });

  return lines.join("\n").trim() + "\n";
}

function buildLlmsFullTxt(entries: LlmsLink[]): string {
  const lines: string[] = [];
  entries.forEach((entry) => {
    if (!entry.url.trim() || !entry.title.trim()) return;
    lines.push(`## ${entry.title.trim()}`);
    lines.push(`URL: ${entry.url.trim()}`);
    if (entry.description.trim()) {
      lines.push("", entry.description.trim());
    }
    lines.push("", "---", "");
  });
  return lines.join("\n").trim() + "\n";
}

export default function LlmsToolPage() {
  const [siteName, setSiteName] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [sections, setSections] = useState<LlmsSection[]>([
    {
      heading: "Documentation",
      links: [
        {
          title: "Getting Started",
          url: "https://example.com/docs/getting-started",
          description: "Overview of how to use the product and key concepts.",
        },
      ],
    },
  ]);

  const [llmsTxt, setLlmsTxt] = useState<string | null>(null);
  const [llmsFull, setLlmsFull] = useState<string | null>(null);

  function updateSection(index: number, updated: Partial<LlmsSection>) {
    setSections((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updated };
      return copy;
    });
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      { heading: "Resources", links: [] },
    ]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function addLink(sectionIndex: number) {
    setSections((prev) => {
      const copy = [...prev];
      const section = copy[sectionIndex];
      section.links = [
        ...section.links,
        { title: "Page title", url: "https://example.com/page", description: "" },
      ];
      copy[sectionIndex] = { ...section };
      return copy;
    });
  }

  function updateLink(
    sectionIndex: number,
    linkIndex: number,
    updated: Partial<LlmsLink>,
  ) {
    setSections((prev) => {
      const copy = [...prev];
      const section = copy[sectionIndex];
      const links = [...section.links];
      links[linkIndex] = { ...links[linkIndex], ...updated };
      section.links = links;
      copy[sectionIndex] = { ...section };
      return copy;
    });
  }

  function removeLink(sectionIndex: number, linkIndex: number) {
    setSections((prev) => {
      const copy = [...prev];
      const section = copy[sectionIndex];
      section.links = section.links.filter((_, i) => i !== linkIndex);
      copy[sectionIndex] = { ...section };
      return copy;
    });
  }

  function handleGenerate() {
    const llmsContent = buildLlmsTxt({ siteName, summary, details, sections });
    setLlmsTxt(llmsContent);

    const allLinks: LlmsLink[] = sections.flatMap((section) => section.links);
    const fullContent = buildLlmsFullTxt(allLinks);
    setLlmsFull(fullContent);
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-16 flex flex-col gap-8">
        <header>
          <h1 className="text-2xl font-semibold">llms.txt Generator</h1>
          <p className="mt-2 text-sm text-slate-300">
            Build an AI-friendly llms.txt index and a companion llms-full.txt bundle for your key pages.
          </p>
        </header>

        <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 flex flex-col gap-4 text-xs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-300">
                Site / project name
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                placeholder="BIGSEO"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-300">
                One-line summary
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                placeholder="Free technical SEO assistant for sitemaps, robots.txt, schema, and llms.txt."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300">
              Additional details (optional)
            </label>
            <textarea
              className="mt-1 h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
              placeholder="Explain who your site is for, what problems it solves, and how content is organized."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <h2 className="text-sm font-semibold text-slate-200">Sections & links</h2>
            <button
              type="button"
              onClick={addSection}
              className="rounded-md bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-700"
            >
              + Add section
            </button>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            {sections.map((section, sIdx) => (
              <div
                key={sIdx}
                className="rounded-md border border-slate-700 bg-slate-950 p-3 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    placeholder="Section heading (e.g. Documentation, Resources, Blog)"
                    value={section.heading}
                    onChange={(e) =>
                      updateSection(sIdx, { heading: e.target.value })
                    }
                  />
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSection(sIdx)}
                      className="text-[11px] text-red-400 hover:text-red-300"
                    >
                      Remove section
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] font-medium text-slate-300">
                    Links
                  </span>
                  <button
                    type="button"
                    onClick={() => addLink(sIdx)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    + Add link
                  </button>
                </div>

                {section.links.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    No links yet. Add high-value pages you want AI tools to read first.
                  </p>
                )}

                {section.links.map((link, lIdx) => (
                  <div key={lIdx} className="flex flex-col gap-1 border-t border-slate-800 pt-2 mt-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <input
                        type="text"
                        className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px]"
                        placeholder="Page title"
                        value={link.title}
                        onChange={(e) =>
                          updateLink(sIdx, lIdx, { title: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px]"
                        placeholder="https://example.com/page"
                        value={link.url}
                        onChange={(e) =>
                          updateLink(sIdx, lIdx, { url: e.target.value })
                        }
                      />
                    </div>
                    <textarea
                      className="mt-1 h-12 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                      placeholder="Short description of what this page covers (helpful for AI tools)."
                      value={link.description}
                      onChange={(e) =>
                        updateLink(sIdx, lIdx, { description: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(sIdx, lIdx)}
                      className="self-end text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Remove link
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-md bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
            >
              Generate llms.txt & llms-full.txt
            </button>
            {llmsTxt && (
              <button
                type="button"
                onClick={() => llmsTxt && downloadFile(llmsTxt, "llms.txt")}
                className="rounded-md border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800"
              >
                Download llms.txt
              </button>
            )}
            {llmsFull && (
              <button
                type="button"
                onClick={() => llmsFull && downloadFile(llmsFull, "llms-full.txt")}
                className="rounded-md border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800"
              >
                Download llms-full.txt
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {llmsTxt && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300">
                  llms.txt preview
                </label>
                <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-slate-950 px-3 py-2 text-[11px] text-slate-100">
                  {llmsTxt}
                </pre>
              </div>
            )}
            {llmsFull && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300">
                  llms-full.txt preview
                </label>
                <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-slate-950 px-3 py-2 text-[11px] text-slate-100">
                  {llmsFull}
                </pre>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 text-xs text-slate-200">
          <h2 className="text-sm font-semibold">How to use llms.txt and llms-full.txt</h2>
          <p className="mt-2">
            The <code className="font-mono">llms.txt</code> file is a concise index that points AI tools to your most important
            pages, organized into sections like Documentation, Resources, and Blog. It follows the structure proposed
            by the llmstxt.org specification and examples from tools like LLMrefs.[
          </p>
          <p className="mt-2">
            Save the generated <code className="font-mono">llms.txt</code> file at the root of your site so it is available at
            <code className="font-mono">https://yourdomain.com/llms.txt</code>. AI assistants and crawlers that support this
            convention will fetch it to discover your key content.[
          </p>
          <p className="mt-2">
            The companion <code className="font-mono">llms-full.txt</code> file is an optional bundle that lists your important
            pages with more detail and can be used for bulk ingestion workflows (similar to patterns described by
            documentation platforms and llms.txt guides). You can host it at a convenient URL such as
            <code className="font-mono">https://yourdomain.com/llms-full.txt</code> or keep it for manual uploads into AI tools.[
          </p>
          <p className="mt-2">
            For best results, choose a small set of high-value pages (docs, pricing, policies, product tours) and write
            clear, descriptive link titles and summaries so models understand what each page covers before fetching it.
          </p>
        </section>
      </div>
    </main>
  );
}
