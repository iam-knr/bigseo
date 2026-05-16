import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BIGSEO – Free Technical SEO Assistant",
  description: "Generate sitemaps, robots.txt, schema, and llms.txt for your website.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-bold tracking-tight text-white hover:text-indigo-400 transition-colors">
              BIGSEO
            </Link>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <Link href="/tools/sitemap" className="hover:text-white transition-colors">Sitemap</Link>
              <Link href="/tools/robots" className="hover:text-white transition-colors">Robots.txt</Link>
              <Link href="/tools/schema" className="hover:text-white transition-colors">Schema</Link>
              <Link href="/tools/llms" className="hover:text-white transition-colors">llms.txt</Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
