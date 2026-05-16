import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const MAX_URLS = 200;
const MAX_DEPTH = 3;
const TIMEOUT_MS = 8000;

function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    // strip hash and trailing slash (except root)
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.href;
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "BigSEO-Crawler/1.0 (+https://bigseo.dev)" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractLinks(html: string, pageUrl: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const normalized = normalizeUrl(href, pageUrl);
    if (!normalized) return;
    const u = new URL(normalized);
    if (u.origin !== origin) return;
    // skip files that aren't pages
    if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|zip|xml)$/i.test(u.pathname)) return;
    links.push(normalized);
  });
  return [...new Set(links)];
}

export async function POST(req: NextRequest) {
  let domain: string;
  try {
    const body = await req.json();
    domain = body.domain;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!domain) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  let startUrl: string;
  try {
    startUrl = new URL(domain.startsWith("http") ? domain : `https://${domain}`).href;
    // ensure no trailing stuff beyond origin for start
    const parsed = new URL(startUrl);
    startUrl = parsed.origin + "/";
  } catch {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const origin = new URL(startUrl).origin;
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
  const found: string[] = [];

  while (queue.length > 0 && found.length < MAX_URLS) {
    const item = queue.shift()!;
    const { url, depth } = item;

    if (visited.has(url)) continue;
    visited.add(url);

    const html = await fetchPage(url);
    if (!html) continue;

    found.push(url);

    if (depth < MAX_DEPTH) {
      const links = extractLinks(html, url, origin);
      for (const link of links) {
        if (!visited.has(link) && found.length + queue.length < MAX_URLS * 2) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }
  }

  return NextResponse.json({ urls: found, count: found.length });
}
