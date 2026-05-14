"use client";

import { useState } from "react";

const KNOWN_BOTS = [
  "*",
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
];

type Rule = {
  path: string;
  directive: "allow" | "disallow";
};

type AgentBlock = {
  userAgent: string;
  rules: Rule[];
  crawlDelay?: string;
};

function buildRobotsTxt(blocks: AgentBlock[], sitemapUrl?: string): string {
  const lines: string[] = [];

  blocks.forEach((block) => {
    if (!block.userAgent.trim()) return;
    lines.push(`User-agent: ${block.userAgent.trim()}`);

    block.rules.forEach((rule) => {
      const path = rule.path.trim();
      if (!path) return;
      const label = rule.directive === "allow" ? "Allow" : "Disallow";
      lines.push(`${label}: ${path}`);
    });

    if (block.crawlDelay?.trim()) {
      lines.push(`Crawl-delay: ${block.crawlDelay.trim()}`);
    }

    lines.push("");
  });

  if (sitemapUrl?.trim()) {
    lines.push(`Sitemap: ${sitemapUrl.trim()}`);
  }

  return lines.join("\n").trim() + "\n";
}

export default function RobotsToolPage() {
  const [blocks, setBlocks] = useState<AgentBlock[]>([{
    userAgent: "*",
    rules: [{ path: "/", directive: "allow" }],
  }]);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [output, setOutput] = useState<string | null>(null);

  function updateBlock(index: number, updated: Partial<AgentBlock>) {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updated };
      return copy;
    });
  }

  function addBlock() {
    setBlocks((prev) => [
      ...prev,
      { userAgent: "*", rules: [], crawlDelay: undefined },
    ]);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function addRule(blockIndex: number) {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[blockIndex] = {
        ...copy[blockIndex],
        rules: [...copy[blockIndex].rules, { path: "/private", directive: "disallow" }],
      };
      return copy;
    });
  }

  function updateRule(blockIndex: number, ruleIndex: number, updated: Partial<Rule>) {
    setBlocks((prev) => {
      const copy = [...prev];
      const rules = [...copy[blockIndex].rules];
      rules[ruleIndex] = { ...rules[ruleIndex], ...updated } as Rule;
      copy[blockIndex] = { ...copy[blockIndex], rules };
      return copy;
    });
  }

  function removeRule(blockIndex: number, ruleIndex: number) {
    setBlocks((prev) => {
      const copy = [...prev];
      const rules = copy[blockIndex].rules.filter((_, i) => i !== ruleIndex);
      copy[blockIndex] = { ...copy[blockIndex], rules };
      return copy;
    });
  }

  function handleGenerate() {
    const txt = buildRobotsTxt(blocks, sitemapUrl);
    setOutput(txt);
  }

  function handleDownload() {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "robots.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-16 flex flex-col gap-8">
        <header>
          <h1 className="text-2xl font-semibold">robots.txt Generator</h1>
          <p className="mt-2 text-sm text-slate-300">
            Configure crawl rules for different bots, generate a robots.txt file, and download it.
          </p>
        </header>

        <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 flex flex-col gap-4 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">User-agent blocks</h2>
            <button
              type="button"
              onClick={addBlock}
              className="rounded-md bg-slate-800 px-3 py-1 font-semibold text-slate-100 hover:bg-slate-700"
            >
              + Add bot block
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {blocks.map((block, index) => (
              <div
                key={index}
                className="rounded-md border border-slate-700 bg-slate-950 p-3 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300">
                      User-agent
                    </label>
                    <select
                      className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                      value={block.userAgent}
                      onChange={(e) => updateBlock(index, { userAgent: e.target.value })}
                    >
                      {KNOWN_BOTS.map((bot) => (
                        <option key={bot} value={bot}>
                          {bot}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300">
                      Crawl-delay (seconds)
                    </label>
                    <input
                      type="text"
                      className="mt-1 w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                      value={block.crawlDelay ?? ""}
                      onChange={(e) => updateBlock(index, { crawlDelay: e.target.value })}
                    />
                  </div>
                  {blocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBlock(index)}
                      className="ml-auto text-[11px] text-red-400 hover:text-red-300"
                    >
                      Remove block
                    </button>
                  )}
                </div>

                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">
                      Rules
                    </span>
                    <button
                      type="button"
                      onClick={() => addRule(index)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300"
                    >
                      + Add rule
                    </button>
                  </div>

                  {block.rules.length === 0 && (
                    <p className="text-[11px] text-slate-500">
                      No rules yet. Add Allow/Disallow paths for this bot.
                    </p>
                  )}

                  {block.rules.map((rule, rIdx) => (
                    <div key={rIdx} className="flex items-center gap-2">
                      <select
                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px]"
                        value={rule.directive}
                        onChange={(e) =>
                          updateRule(index, rIdx, {
                            directive: e.target.value as Rule["directive"],
                          })
                        }
                      >
                        <option value="allow">Allow</option>
                        <option value="disallow">Disallow</option>
                      </select>
                      <input
                        type="text"
                        className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px]"
                        placeholder="/path or /folder/"
                        value={rule.path}
                        onChange={(e) =>
                          updateRule(index, rIdx, { path: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeRule(index, rIdx)}
                        className="text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-[11px] font-medium text-slate-300">
              Sitemap URL (optional)
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              placeholder="https://yourdomain.com/sitemap.xml"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-md bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
            >
              Generate robots.txt
            </button>
            {output && (
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-md border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800"
              >
                Download robots.txt
              </button>
            )}
          </div>

          {output && (
            <div className="mt-4">
              <label className="block text-[11px] font-medium text-slate-300">
                Preview
              </label>
              <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-slate-950 px-3 py-2 text-[11px] text-slate-100">
                {output}
              </pre>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 text-xs text-slate-200">
          <h2 className="text-sm font-semibold">How to use robots.txt</h2>
          <p className="mt-2">
            Save the generated content as <code className="font-mono">robots.txt</code> and upload it to the root of your
            site so it is available at <code className="font-mono">https://yourdomain.com/robots.txt</code>. Search engine
            crawlers like Googlebot check this file before crawling.[
          </p>
          <p className="mt-2">
            On WordPress, most SEO plugins manage robots.txt for you. To use a custom file like this, you may need to
            disable the plugin&apos;s robots.txt feature and upload the file via your hosting file manager.
          </p>
          <p className="mt-2">
            On React/Next.js or other SPA setups, you can place the file into your <code className="font-mono">public/</code> folder so it is
            served from the root path. For custom PHP or frameworks, place the file at the web server document root and
            ensure it is accessible.
          </p>
          <p className="mt-2">
            Follow the general guidelines from search engines (for example, Google&apos;s robots.txt documentation) when
            deciding what to block or allow.
          </p>
        </section>
      </div>
    </main>
  );
}
