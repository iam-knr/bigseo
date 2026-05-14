import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import RobotsParser from "robots-txt-parser";

const robots = RobotsParser({
  userAgent: "BIGSEO-Bot",
  allowOnNeutral: true,
});

function getOrigin(input: string) {
  const url = new URL(input);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url");

  if (!urlParam) {
    return NextResponse.json(
      { error: "Missing ?url parameter" },
      { status: 400 }
    );
  }

  const target = urlParam.trim();
  const origin = getOrigin(target);

  // 1) Fetch page
  let pageStatus = 0;
  let reachable = false;
  let html = "";
  let title: string | undefined;
  let description: string | undefined;
  let canonical: string | undefined;
  let schemaTypes: string[] = [];

  try {
    const res = await fetch(target, { redirect: "follow" });
    pageStatus = res.status;
    reachable = res.ok;
    html = await res.text();

    const $ = cheerio.load(html);
    title = $("title").first().text().trim() || undefined;
    description =
      $('meta[name="description"]').attr("content")?.trim() || undefined;
    canonical = $('link[rel="canonical"]').attr("href")?.trim() || undefined;

    const ldNodes = $("script[type='application/ld+json']").toArray();
    const types = new Set<string>();
    for (const node of ldNodes) {
      const jsonText = $(node).text();
      try {
        const data = JSON.parse(jsonText);
        if (Array.isArray(data)) {
          data.forEach((item) => {
            const t = (item as any)["@type"];
            if (typeof t === "string") types.add(t);
            if (Array.isArray(t)) t.forEach((v) => types.add(String(v)));
          });
        } else if (data) {
          const t = (data as any)["@type"];
          if (typeof t === "string") types.add(t);
          if (Array.isArray(t)) t.forEach((v) => types.add(String(v)));
        }
      } catch {
        // ignore malformed JSON-LD
      }
    }
    schemaTypes = Array.from(types);
  } catch {
    reachable = false;
  }

  // 2) robots.txt
  const robotsUrl = `${origin}/robots.txt`;
  let robotsFound = false;
  let allowsGooglebot: boolean | undefined;
  let allowsGptBot: boolean | undefined;
  let allowsClaudeBot: boolean | undefined;
  let allowsPerplexityBot: boolean | undefined;
  let sitemapUrls: string[] = [];
  let robotsRaw: string | undefined;

  try {
    await robots.fetch(robotsUrl);
    robotsFound = true;
    // robots-txt-parser exposes internal structure; types are loose so we cast.
    const anyRobots = robots as any;
    robotsRaw = anyRobots.robots?.[robotsUrl]?.robotsTxt;

    allowsGooglebot = await robots.canCrawl(target, "Googlebot");
    allowsGptBot = await robots.canCrawl(target, "GPTBot");
    allowsClaudeBot = await robots.canCrawl(target, "ClaudeBot");
    allowsPerplexityBot = await robots.canCrawl(target, "PerplexityBot");

    sitemapUrls = (await robots.getSitemaps()) || [];
  } catch {
    robotsFound = false;
  }

  // 3) sitemap.xml probes
  let sitemapFound = false;
  let primarySitemapUrl: string | undefined;
  let urlCount: number | undefined;
  let rawSample: string | undefined;

  const sitemapCandidates = [
    ...sitemapUrls,
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
  ].filter(Boolean);

  for (const smUrl of sitemapCandidates) {
    try {
      const res = await fetch(smUrl);
      if (res.ok && res.headers.get("content-type")?.includes("xml")) {
        sitemapFound = true;
        primarySitemapUrl = smUrl;
        const xml = await res.text();
        rawSample = xml.slice(0, 2000);

        const matches = xml.match(/<loc>/g);
        if (matches) urlCount = matches.length;
        break;
      }
    } catch {
      // ignore
    }
  }

  // 4) llms.txt / llms-full.txt
  const llmsTxtUrl = `${origin}/llms.txt`;
  const llmsFullTxtUrl = `${origin}/llms-full.txt`;

  const [llmsRes, llmsFullRes] = await Promise.allSettled([
    fetch(llmsTxtUrl),
    fetch(llmsFullTxtUrl),
  ]);

  const llmsTxtFound =
    llmsRes.status === "fulfilled" && llmsRes.value.ok === true;
  const llmsFullTxtFound =
    llmsFullRes.status === "fulfilled" && llmsFullRes.value.ok === true;

  return NextResponse.json({
    ok: true,
    url: target,
    normalizedUrl: target,
    page: {
      status: pageStatus,
      reachable,
      title,
      description,
      canonical,
    },
    robots: {
      url: robotsUrl,
      found: robotsFound,
      allowsGooglebot,
      allowsGptBot,
      allowsClaudeBot,
      allowsPerplexityBot,
      sitemapUrls,
      raw: robotsRaw,
    },
    sitemap: {
      checkedUrls: sitemapCandidates,
      found: sitemapFound,
      primarySitemapUrl,
      urlCount,
      rawSample,
    },
    llms: {
      llmsTxtUrl,
      llmsTxtFound,
      llmsFullTxtUrl,
      llmsFullTxtFound,
    },
    schema: {
      present: schemaTypes.length > 0,
      types: schemaTypes,
    },
  });
}
