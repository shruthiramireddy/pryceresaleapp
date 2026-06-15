export const dynamic = "force-dynamic";

import Link from "next/link";
import { getRecentSearches } from "@/lib/searches";

function formatRelativeTime(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function formatPrice(value: string | null) {
  if (!value) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatCondition(condition: string) {
  return condition.replace(/_/g, " ");
}

export default async function HistoryPage() {
  const recentSearches = await getRecentSearches(20);

  return (
    <div className="min-h-full bg-white text-zinc-900">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="space-y-3">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
          >
            ← Back to Pryce
          </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Recent Searches
            </h1>
            <p className="text-zinc-500">
              Your last 20 price lookups. Tap a search to run it again.
            </p>
          </div>
        </header>

        {recentSearches.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 px-4 py-6 text-sm text-zinc-500">
            No searches yet. Run your first estimate on the home page.
          </p>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
            {recentSearches.map((search) => {
              const href = `/?brand=${encodeURIComponent(search.brand)}&item=${encodeURIComponent(search.query)}&condition=${encodeURIComponent(search.condition)}`;

              return (
                <Link
                  key={search.id}
                  href={href}
                  className="flex items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-zinc-50"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">
                      {search.brand} · {search.query}
                    </p>
                    <p className="text-sm capitalize text-zinc-500">
                      {formatCondition(search.condition)} · {search.result_count}{" "}
                      comps
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium">
                      {formatPrice(search.median_price)}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatRelativeTime(search.created_at)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
