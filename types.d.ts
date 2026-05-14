// Type declarations for modules without published TypeScript types

declare module "robots-txt-parser" {
  export interface RobotsParserOptions {
    userAgent?: string;
    allowOnNeutral?: boolean;
  }

  export interface SitemapInfo {
    url: string;
    content: string;
  }

  export interface RobotsParser {
    fetch(url: string): Promise<void>;
    canCrawl(url: string, userAgent?: string): Promise<boolean | undefined>;
    getSitemaps(): Promise<string[]>;
    robots: Record<string, {
      robotsTxt: string;
    }>;
  }

  function RobotsParser(options?: RobotsParserOptions): RobotsParser;

  export default RobotsParser;
}
