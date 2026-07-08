import Link from "next/link";
import { auth } from "@/lib/auth";

const features = [
  {
    title: "Keyword rank tracking",
    body: "Daily SERP position checks per country and device, with history charts and movement alerts.",
  },
  {
    title: "Backlink monitoring",
    body: "Watch new and lost backlinks with anchor text and domain rating, and get notified on changes.",
  },
  {
    title: "Technical SEO audits",
    body: "Automated crawls checking titles, meta tags, indexability, sitemaps and Core Web Vitals.",
  },
  {
    title: "Google integrations",
    body: "Search Console clicks & impressions, GA4 sessions and PageSpeed Insights in one dashboard.",
  },
  {
    title: "Scheduled scans & alerts",
    body: "Daily, weekly or monthly scans with email notifications when rankings move or issues appear.",
  },
  {
    title: "Client-ready reports",
    body: "One-click PDF and CSV reports covering rankings, backlinks and site health.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  return (
    <main className="flex-1">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-indigo-600">RankLens</span>
          <nav className="flex items-center gap-3">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-slate-900">
          All your SEO data, <span className="text-indigo-600">one clean dashboard</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          RankLens tracks your keyword rankings, backlinks and site health, pulls in Search Console
          and GA4 data, and turns it all into reports your team and clients actually read.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Start tracking free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        RankLens — SEO analytics
      </footer>
    </main>
  );
}
