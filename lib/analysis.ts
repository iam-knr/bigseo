// Shared analysis library - used by both the analyze page and /api/analyze
// This avoids self-referential HTTP calls and keeps logic DRY

export interface RobotsData {
  sitemaps: string[];
  disallowPaths: string[];
  allowPaths: string[];
  raw: string;
}

export interface UrlAnalysisResult {
  url: string;
  hostname: string;
  protocol: string;
  robotsTxt: RobotsData | null;
  sitemapUrls: string[];
  metaTags: Record<string, string | null>;
  headings: Record<string, string[]>;
  links: { internal: string[]; external: string[] };
  performance: { loadTime?: number; size?: number };
  errors: string[];
  warnings: string[];
}

export async function fetchRobotsTxt(baseUrl: string): Promise<RobotsData | null> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const res = await fetch(robotsUrl, { timeout: 5000 });
    if (!res.ok) return null;
    const robotsRaw = await res.text();

    const sitemaps: string[] = [];
    const disallowPaths: string[] = [];
    const allowPaths: string[] = [];

    for (const line of robotsRaw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...rest] = trimmed.split(':');
      if (!key || rest.length === 0) continue;

      const value = rest.join(':').trim();
      const keyLower = key.trim().toLowerCase();

      if (keyLower === 'sitemap') {
        sitemaps.push(value);
      } else if (keyLower === 'disallow') {
        if (value) disallowPaths.push(value);
      } else if (keyLower === 'allow') {
        if (value) allowPaths.push(value);
      }
    }

    return { sitemaps, disallowPaths, allowPaths, raw: robotsRaw };
  } catch {
    return null;
  }
}

export async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
  const urls: string[] = [];
  try {
    const res = await fetch(sitemapUrl, { timeout: 10000 });
    if (!res.ok) return urls;
    const text = await res.text();

    // Handle sitemap index
    const indexMatches = text.match(/<sitemap[^>]*><loc>([^<]+)<\/loc>/gi) || [];
    if (indexMatches.length > 0) {
      const subSitemapUrls = indexMatches.map(m => {
        const match = m.match(/<loc>([^<]+)<\/loc>/i);
        return match ? match[1] : null;
      }).filter(Boolean) as string[];

      const allSubUrls: string[][] = await Promise.all(
        subSitemapUrls.slice(0, 5).map(url => fetchSitemapUrls(url))
      );
      return allSubUrls.flat();
    }

    // Handle regular sitemap
    const urlMatches = text.match(/<loc>([^<]+)<\/loc>/gi) || [];
    urlMatches.forEach(m => {
      const match = m.match(/<loc>([^<]+)<\/loc>/i);
      if (match && match[1]) urls.push(match[1]);
    });
  } catch {
    // swallow
  }
  return urls;
}

export async function fetchPageMeta(htmlUrl: string): Promise<{ metaTags: Record<string, string | null>; headings: Record<string, string[]>; links: { internal: string[]; external: string[] } }> {
  const metaTags: Record<string, string | null> = {};
  const headings: Record<string, string[]> = { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };
  const links = { internal: [], external: [] };

  const metaPatterns: Record<string, RegExp> = {
    title: /<title[^>]*>([^<]+)<\/title>/i,
    description: /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ogTitle: /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    ogDescription: /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    ogImage: /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    canonical: /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    robots: /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i,
    viewport: /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i,
  };

  try {
    const res = await fetch(htmlUrl, {
      timeout: 10000,
      headers: { 'Accept': 'text/html' },
      redirect: 'follow',
    });
    if (!res.ok) return { metaTags, headings, links };
    const html = await res.text();

    // Extract meta tags
    for (const [key, pattern] of Object.entries(metaPatterns)) {
      const match = html.match(pattern);
      metaTags[key] = match ? match[1].trim() : null;
    }

    // Extract headings
    for (const tag of Object.keys(headings)) {
      const pattern = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'gi');
      const matches = html.match(pattern) || [];
      headings[tag] = matches.map(m => {
        const content = m.replace(new RegExp(`<${tag}[^>]*>|<\/${tag}>`, 'gi'), '');
        return content.trim().replace(/\s+/g, ' ');
      }).filter(Boolean);
    }

    // Extract links
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    const linkMatches = html.match(linkPattern) || [];
    const baseHost = new URL(htmlUrl).hostname;
    linkMatches.forEach(m => {
      const hrefMatch = m.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        const href = hrefMatch[1];
        if (href.startsWith('/') || href.startsWith(baseHost) || href.startsWith('#')) {
          links.internal.push(href);
        } else if (/^https?:\/\//i.test(href)) {
          links.external.push(href);
        }
      }
    });
  } catch {
    // swallow
  }

  return { metaTags, headings, links };
}

export async function runAnalysis(inputUrl: string): Promise<UrlAnalysisResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Normalize URL
  let normalizedUrl = inputUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    errors.push('Invalid URL format');
    return {
      url: normalizedUrl,
      hostname: '',
      protocol: '',
      robotsTxt: null,
      sitemapUrls: [],
      metaTags: {},
      headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
      links: { internal: [], external: [] },
      performance: {},
      errors,
      warnings,
    };
  }

  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  const result: UrlAnalysisResult = {
    url: normalizedUrl,
    hostname: parsedUrl.hostname,
    protocol: parsedUrl.protocol.replace(':', ''),
    robotsTxt: null,
    sitemapUrls: [],
    metaTags: {},
    headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
    links: { internal: [], external: [] },
    performance: {},
    errors,
    warnings,
  };

  // 1. Fetch robots.txt
  const robotsData = await fetchRobotsTxt(baseUrl);
  result.robotsTxt = robotsData;
  if (robotsData) {
    if (robotsData.sitemaps.length > 0) {
      warnings.push(robotsData.sitemaps.length === 1
        ? `Sitemap found in robots.txt: ${robotsData.sitemaps[0]}`
        : `Found ${robotsData.sitemaps.length} sitemaps in robots.txt`);
    }
  } else {
    warnings.push('robots.txt not found or could not be fetched');
  }

  // 2. Fetch sitemap URLs
  if (robotsData && robotsData.sitemaps.length > 0) {
    const allSitemapUrls = await Promise.all(
      robotsData.sitemaps.map(s => fetchSitemapUrls(s))
    );
    result.sitemapUrls = [...new Set(allSitemapUrls.flat())];
  } else {
    // Try common sitemap locations
    const commonPaths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap/sitemap.xml'];
    for (const path of commonPaths) {
      const subUrls = await fetchSitemapUrls(baseUrl + path);
      if (subUrls.length > 0) {
        result.sitemapUrls = subUrls;
        break;
      }
    }
  }

  // 3. Fetch page meta tags
  const metaStartTime = Date.now();
  const metaResult = await fetchPageMeta(normalizedUrl);
  result.metaTags = metaResult.metaTags;
  result.headings = metaResult.headings;
  result.links = metaResult.links;
  result.performance.loadTime = Date.now() - metaStartTime;

  // Validate key SEO elements
  if (!result.metaTags.title) {
    errors.push('Page is missing a <title> tag');
  } else if (result.metaTags.title.length < 30) {
    warnings.push('Title tag is shorter than 30 characters (ideal: 50-60)');
  } else if (result.metaTags.title.length > 60) {
    warnings.push('Title tag is longer than 60 characters');
  }

  if (!result.metaTags.description) {
    warnings.push('Page is missing a meta description');
  } else if (result.metaTags.description.length < 120) {
    warnings.push('Meta description is shorter than 120 characters (ideal: 150-160)');
  } else if (result.metaTags.description.length > 160) {
    warnings.push('Meta description is longer than 160 characters');
  }

  if (result.headings.h1.length === 0) {
    errors.push('Page is missing an H1 heading');
  } else if (result.headings.h1.length > 1) {
    warnings.push('Page has multiple H1 headings (should have only one)');
  }

  if (!result.metaTags.canonical) {
    warnings.push('No canonical URL specified');
  }

  if (!result.metaTags.viewport) {
    errors.push('Viewport meta tag is missing (likely not mobile-friendly)');
  }

  if (result.links.internal.length === 0) {
    warnings.push('No internal links found on the page');
  }

  if (result.links.external.length === 0) {
    warnings.push('No external links found on the page');
  }

  return result;
}
