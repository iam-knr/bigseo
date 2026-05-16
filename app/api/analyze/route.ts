// BIGSEO - /api/analyze
// Simple robots.txt parser using native fetch (no external libs needed)
// Works reliably on Vercel serverless functions

import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface RoboticRules {
	userAgent: string;
	allow: string[];
	disallow: string[];
}

function parseRobotsTxt(content: string): { rules: RoboticRules[]; sitemaps: string[] } {
	const lines = content.split(/\r?\n/);
	const blocks: RoboticRules[] = [];
	const sitemaps: string[] = [];
	let currentBlock: RoboticRules | null = null;

	for (const rawLine of lines) {
		const line = rawLine.split("#")[0].trim();
		if (!line) continue;
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;
		const key = line.slice(0, colonIdx).trim().toLowerCase();
		const value = line.slice(colonIdx + 1).trim();
		if (key === "user-agent") {
			if (currentBlock) blocks.push(currentBlock);
			currentBlock = { userAgent: value, allow: [], disallow: [] };
		} else if (key === "allow" && currentBlock) {
			currentBlock.allow.push(value);
		} else if (key === "disallow" && currentBlock) {
			currentBlock.disallow.push(value);
		} else if (key === "sitemap") {
			sitemaps.push(value);
		}
	}
	if (currentBlock) blocks.push(currentBlock);
	if (blocks.length === 0 && content.trim().length > 0) {
		blocks.push({ userAgent: "*", allow: [], disallow: [] });
	}
	return { rules: blocks, sitemaps };
}

function pathMatches(path: string, pattern: string): boolean {
	if (pattern === "/") return true;
	if (pattern.endsWith("*")) {
		const prefix = pattern.slice(0, -1);
		return path.startsWith(prefix);
	}
	return path === pattern;
}

function isAllowed(
	path: string,
	rules: readonly RoboticRules[],
	bot: string,
): boolean | undefined {
	let bestMatch: RoboticRules | null = null;
	for (const block of rules) {
		if (block.userAgent === bot || block.userAgent === "*") {
			if (!bestMatch || block.userAgent === bot) {
				bestMatch = block;
			}
		}
	}
	if (!bestMatch) return undefined;
	if (bestMatch.allow.length === 0 && bestMatch.disallow.length === 0) return true;
	let isAllowedFlag: boolean | null = null;
	for (const pattern of bestMatch.disallow) {
		if (pathMatches(path, pattern)) {
			isAllowedFlag = false;
		}
	}
	for (const pattern of bestMatch.allow) {
		if (pathMatches(path, pattern)) {
			isAllowedFlag = true;
		}
	}
	return isAllowedFlag ?? true;
}

function getOrigin(input: string): string {
	const url = new URL(input);
	return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const urlParam = searchParams.get("url");
	if (!urlParam) {
		return NextResponse.json({ error: "Missing ?url parameter" }, { status: 400 });
	}

	const target = urlParam.trim();
	const origin = getOrigin(target);

	// 1) Fetch page
	let pageStatus = 0;
	let reachable = false;
	let title: string | undefined;
	let description: string | undefined;
	let canonical: string | undefined;
	let schemaTypes: string[] = [];

	try {
		const res = await fetch(target, { redirect: "follow" });
		pageStatus = res.status;
		reachable = res.ok;
		const html = await res.text();
		const $ = cheerio.load(html);
		title = $("title").first().text().trim() || undefined;
		description =
			$('meta[name="description"]').attr("content")?.trim() || undefined;
		canonical =
			$('link[rel="canonical"]').attr("href")?.trim() || undefined;
		const ldNodes = $("script[type='application/ld+json']").toArray();
		const types = new Set<string>();
		for (const node of ldNodes) {
			const jsonText = $(node).text();
			try {
				const data =
					JSON.parse(jsonText) as
						| { [key: string]: unknown }
						| { [key: string]: unknown }[];
				const handleTypes = (t: unknown) => {
					if (typeof t === "string") types.add(t);
					if (Array.isArray(t)) t.forEach((v) => types.add(String(v)));
				};
				if (Array.isArray(data)) {
					data.forEach((item) => {
						const t = (item as { [key: string]: unknown })["@type"];
						handleTypes(t);
					});
				} else if (data) {
					const t = data["@type"];
					handleTypes(t);
				}
			} catch {
				// ignore malformed JSON-LD
			}
		}
		schemaTypes = Array.from(types);
	} catch {
		reachable = false;
	}

	// 2) robots.txt - native fetch + simple text parsing
	const robotsUrl = `${origin}/robots.txt`;
	let robotsFound = false;
	let robotsRaw: string | undefined;
	let allowsGooglebot: boolean | undefined;
	let allowsGptBot: boolean | undefined;
	let allowsClaudeBot: boolean | undefined;
	let allowsPerplexityBot: boolean | undefined;
	let robotsSitemapUrls: string[] = [];

	try {
		const robotsRes = await fetch(robotsUrl);
		if (robotsRes.ok) {
			robotsRaw = await robotsRes.text();
			robotsFound = true;
			const { rules, sitemaps } = parseRobotsTxt(robotsRaw);
			allowsGooglebot = isAllowed(target, rules, "Googlebot");
			allowsGptBot = isAllowed(target, rules, "GPTBot");
			allowsClaudeBot = isAllowed(target, rules, "ClaudeBot");
			allowsPerplexityBot = isAllowed(target, rules, "PerplexityBot");
			robotsSitemapUrls = sitemaps;
		}
	} catch {
		robotsFound = false;
	}

	// 3) sitemap.xml probes
	let sitemapFound = false;
	let primarySitemapUrl: string | undefined;
	let urlCount: number | undefined;
	let rawSample: string | undefined;

	const sitemapCandidates = [
		...robotsSitemapUrls,
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
		llmsRes.status === "fulfilled" &&
		llmsRes.value.ok === true;
	const llmsFullTxtFound =
		llmsFullRes.status === "fulfilled" &&
		llmsFullRes.value.ok === true;

	const response = {
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
			sitemapUrls: robotsSitemapUrls,
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
	};

	return NextResponse.json(response);
}
