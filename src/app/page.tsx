"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { CompCard } from "@/components/CompCard";
import { PriceChart } from "@/components/PriceChart";
import type { ListingMatch, PriceStats } from "@/lib/estimate";

type Condition = "new" | "like_new" | "good" | "fair";

type EstimateSuccess = {
  comps: ListingMatch[];
  stats: PriceStats;
  liveData: boolean;
};

type EstimateInsufficient = {
  insufficient: true;
  count: number;
};

const ACCENT = "#FF4D00";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function isCondition(value: string | null): value is Condition {
  return (
    value === "new" ||
    value === "like_new" ||
    value === "good" ||
    value === "fair"
  );
}

function LoadingSpinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
      aria-hidden="true"
    />
  );
}

function ResultsSkeleton() {
  return (
    <section
      className="mx-auto mt-12 max-w-2xl space-y-4 px-6"
      aria-busy="true"
      aria-label="Loading price estimate"
    >
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl bg-gray-200"
          />
        ))}
      </div>
      <div className="h-48 w-full animate-pulse rounded-2xl bg-gray-200" />
    </section>
  );
}

function PrycePage() {
  const searchParams = useSearchParams();

  const initialSearch = useMemo(() => {
    const brandParam = searchParams.get("brand");
    const itemParam = searchParams.get("item");
    const conditionParam = searchParams.get("condition");

    if (!brandParam || !itemParam || !isCondition(conditionParam)) {
      return null;
    }

    return {
      brand: brandParam,
      itemName: itemParam,
      condition: conditionParam,
    };
  }, [searchParams]);

  const pageKey = initialSearch
    ? `${initialSearch.brand}|${initialSearch.itemName}|${initialSearch.condition}`
    : "manual";

  return <PrycePageContent key={pageKey} initialSearch={initialSearch} />;
}

function PrycePageContent({
  initialSearch,
}: {
  initialSearch: {
    brand: string;
    itemName: string;
    condition: Condition;
  } | null;
}) {
  const [brand, setBrand] = useState(initialSearch?.brand ?? "");
  const [itemName, setItemName] = useState(initialSearch?.itemName ?? "");
  const [condition, setCondition] = useState<Condition>(
    initialSearch?.condition ?? "good",
  );
  const [loading, setLoading] = useState(Boolean(initialSearch));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    EstimateSuccess | EstimateInsufficient | null
  >(null);

  const runEstimate = useCallback(
    async (values: { brand: string; itemName: string; condition: Condition }) => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const response = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        let data: unknown;
        try {
          data = await response.json();
        } catch {
          throw new Error("The server returned an invalid response.");
        }

        if (!response.ok) {
          const message =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Something went wrong. Please try again.";
          throw new Error(message);
        }

        setResult(data as EstimateSuccess | EstimateInsufficient);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Something went wrong. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const autoSearchKey = initialSearch
    ? `${initialSearch.brand}|${initialSearch.itemName}|${initialSearch.condition}`
    : null;

  useEffect(() => {
    if (!autoSearchKey || !initialSearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runEstimate(initialSearch);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [autoSearchKey, initialSearch, runEstimate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runEstimate({ brand, itemName, condition });
  }

  const successResult =
    result && !("insufficient" in result) ? result : null;
  const insufficientResult =
    result && "insufficient" in result ? result : null;

  const inputClassName =
    "w-full rounded-xl border-2 border-black bg-white p-3 text-lg font-medium text-black outline-none transition-colors focus:border-[#FF4D00]";

  return (
    <div className="min-h-full bg-white font-medium text-black">
      {/* Header */}
      <header className="w-full border-b-2 border-black bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-black tracking-tight sm:text-3xl">
              PRYCE
            </span>
            <span
              className="mb-1 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: ACCENT }}
              aria-hidden="true"
            />
          </div>
          <Link
            href="/history"
            className="text-sm font-black uppercase tracking-wide text-black transition-opacity hover:opacity-60"
          >
            History
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-2xl px-6 pt-12 text-center">
        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Find out what your{" "}
          <span style={{ color: ACCENT }}>clothes</span> are worth.
        </h1>
        <p className="mt-4 text-base text-zinc-500 sm:text-lg">
          Real sold prices from eBay, updated live.
        </p>
      </section>

      {/* Search card */}
      <section className="mx-auto mt-8 max-w-xl px-6">
        <div className="rounded-2xl border-2 border-black bg-white p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="brand"
                className="mb-2 block text-xs font-black uppercase tracking-widest"
              >
                Brand
              </label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="Levi's, Nike, Arc'teryx..."
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="itemName"
                className="mb-2 block text-xs font-black uppercase tracking-widest"
              >
                Item name
              </label>
              <input
                id="itemName"
                type="text"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="501 Jeans, Puffer Jacket..."
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="condition"
                className="mb-2 block text-xs font-black uppercase tracking-widest"
              >
                Condition
              </label>
              <select
                id="condition"
                value={condition}
                onChange={(event) =>
                  setCondition(event.target.value as Condition)
                }
                className={inputClassName}
              >
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl py-4 text-xl font-black text-white transition-opacity disabled:opacity-70"
              style={{ backgroundColor: ACCENT }}
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  <span>SEARCHING...</span>
                </>
              ) : (
                "GET PRICE →"
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Loading */}
      {loading && <ResultsSkeleton />}

      {/* Error */}
      {error && !loading && (
        <div
          role="alert"
          className="mx-auto mt-8 max-w-xl rounded-2xl border-2 border-red-500 p-6"
        >
          <p className="text-xl font-black text-red-500">Something went wrong.</p>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      )}

      {/* Insufficient */}
      {insufficientResult && !loading && (
        <div className="mx-auto mt-12 max-w-xl px-6 text-center">
          <p className="text-6xl" aria-hidden="true">
            😞
          </p>
          <p className="mt-4 text-2xl font-black">
            Not enough data for this search.
          </p>
          <p className="mt-2 text-gray-500">
            Try a more common brand or item name — like Levi&apos;s jeans or Nike
            hoodie.
          </p>
        </div>
      )}

      {/* Results */}
      {successResult && !loading && (
        <section className="mx-auto mt-12 max-w-2xl space-y-10 px-6 pb-16">
          {/* Live data banner */}
          <div className="flex justify-center">
            {successResult.liveData ? (
              <span className="rounded-full bg-green-100 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-green-700">
                ● Live eBay data
              </span>
            ) : (
              <span className="rounded-full bg-[#F5F5F5] px-4 py-1.5 text-xs font-black uppercase tracking-wide text-zinc-500">
                ● Cached data
              </span>
            )}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border-2 border-black bg-[#F5F5F5] p-6 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                Low
              </p>
              <p className="mt-3 text-4xl font-black leading-none">
                {formatPrice(successResult.stats.p10)}
              </p>
            </div>

            <div
              className="rounded-2xl border-2 border-black p-6 text-center text-white"
              style={{ backgroundColor: ACCENT }}
            >
              <p className="text-xs font-black uppercase tracking-widest text-white/80">
                Fair Market
              </p>
              <p className="mt-3 text-4xl font-black leading-none">
                {formatPrice(successResult.stats.median)}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-black bg-[#F5F5F5] p-6 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                High
              </p>
              <p className="mt-3 text-4xl font-black leading-none">
                {formatPrice(successResult.stats.p90)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div>
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest">
              Price distribution
            </h2>
            <PriceChart
              comps={successResult.comps}
              stats={successResult.stats}
            />
          </div>

          {/* Comps grid */}
          <div>
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest">
              Sold listings ({successResult.comps.length})
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {successResult.comps.map((comp) => (
                <CompCard key={comp.id} comp={comp} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full bg-white px-6 py-12">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl bg-gray-200"
                />
              ))}
            </div>
            <div className="h-48 w-full animate-pulse rounded-2xl bg-gray-200" />
          </div>
        </div>
      }
    >
      <PrycePage />
    </Suspense>
  );
}
