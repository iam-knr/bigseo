import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BIGSEO  Free Technical SEO Assistant",
  description:
    "Generate sitemaps, robots.txt, schema, and llms.txt for your website.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <header className="border-b border-slate-800 bg-slate-950/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <a href="/" className="text-sm font-semibold tracking-tight">
              BIGSEO
            </a>
            <nav className="flex gap-4 text-xs text-slate-300">
              <a href="/tools/sitemap" className="hover:text-white">
                Sitemap
              </a>
              <a href="/tools/robots" className="hover:text-white">
                Robots.txt
              </a>
              <a href="/tools/schema" className="hover:text-white">
                Schema
              </a>
              <a href="/tools/llms" className="hover:text-white">
                llms.txt
              </a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
