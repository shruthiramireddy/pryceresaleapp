"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { CompCard } from "@/components/CompCard";
import { PriceChart } from "@/components/PriceChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { AiSummary } from "@/lib/claude";
import type { ListingMatch, PriceStats } from "@/lib/estimate";

type Condition = "new" | "like_new" | "good" | "fair";

type EstimateSuccess = {
  comps: ListingMatch[];
  stats: PriceStats;
  aiSummary: AiSummary | null;
  cached: boolean;
  liveData: boolean;
};

type EstimateInsufficient = {
  insufficient: true;
  count: number;
  liveData?: boolean;
};

type UrlSearch = {
  brand: string;
  itemName: string;
  condition: Condition;
};

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

function getUrlSearch(searchParams: URLSearchParams): UrlSearch | null {
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
}

function ResultsSkeleton() {
  return (
    <section
      className="space-y-10"
      aria-busy="true"
      aria-label="Loading price estimate"
    >
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-6"
          >
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </section>
  );
}

function LiveDataBadge({ liveData }: { liveData: boolean }) {
  if (liveData) {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Live eBay data
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-zinc-100 text-zinc-600">
      Seeded data
    </Badge>
  );
}

function EstimatePage({ initialSearch }: { initialSearch: UrlSearch | null }) {
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

  return (
    <div className="min-h-full font-sans text-zinc-900">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-6 py-12">
        <header className="space-y-2 text-center sm:text-left">
          <h1 className="text-4xl font-bold tracking-tight">Pryce</h1>
          <p className="text-lg text-zinc-500">
            Find out what your clothes are actually worth
          </p>
        </header>

        <Card className="rounded-xl border border-zinc-200 bg-white p-1 shadow-none">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-lg">Search sold listings</CardTitle>
            <CardDescription>
              Compare recent sales to estimate your resale price.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="brand" className="text-sm font-medium">
                  Brand
                </label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  placeholder="e.g. Levi's, Arc'teryx, Nike"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="itemName" className="text-sm font-medium">
                  Item name
                </label>
                <Input
                  id="itemName"
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  placeholder="e.g. 501 Jeans, Puffer Jacket"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="condition" className="text-sm font-medium">
                  Condition
                </label>
                <Select
                  value={condition}
                  onValueChange={(value) => setCondition(value as Condition)}
                >
                  <SelectTrigger id="condition" className="w-full">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="like_new">Like New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Estimating..." : "Get Price Estimate"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading && <ResultsSkeleton />}

        {error && !loading && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {insufficientResult && !loading && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
            Not enough data yet for this item — try a more common brand or item
            name.
          </div>
        )}

        {successResult && !loading && (
          <section className="space-y-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Price estimate
              </h2>
              <LiveDataBadge liveData={successResult.liveData} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-6 text-center">
                <p className="text-[36px] font-semibold leading-none tracking-tight">
                  {formatPrice(successResult.stats.p10)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">Low</p>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-zinc-300 bg-zinc-50 p-6 text-center">
                <p className="text-[36px] font-semibold leading-none tracking-tight">
                  {formatPrice(successResult.stats.median)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">Fair Market</p>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-6 text-center">
                <p className="text-[36px] font-semibold leading-none tracking-tight">
                  {formatPrice(successResult.stats.p90)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">High</p>
              </div>
            </div>

            {successResult.aiSummary && (
              <Card className="rounded-xl border-emerald-200 bg-emerald-50/50 shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">Recommended price</CardTitle>
                  <CardDescription>
                    Based on {successResult.stats.count} comparable sales
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[36px] font-semibold leading-none tracking-tight text-emerald-700">
                      {formatPrice(
                        successResult.aiSummary.price_recommendation,
                      )}
                    </p>
                    <Badge
                      variant="secondary"
                      className="capitalize bg-white/80"
                    >
                      {successResult.aiSummary.confidence} confidence
                    </Badge>
                  </div>

                  <p className="text-zinc-700">
                    {successResult.aiSummary.market_context}
                  </p>

                  <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-700">
                    {successResult.aiSummary.sell_tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            <div>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
                Price distribution
              </h2>
              <PriceChart
                comps={successResult.comps}
                stats={successResult.stats}
              />
            </div>

            <div>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
                Comparable sales ({successResult.comps.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {successResult.comps.map((comp) => (
                  <CompCard key={comp.id} comp={comp} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const initialSearch = useMemo(
    () => getUrlSearch(searchParams),
    [searchParams],
  );
  const pageKey = initialSearch
    ? `${initialSearch.brand}|${initialSearch.itemName}|${initialSearch.condition}`
    : "manual";

  return <EstimatePage key={pageKey} initialSearch={initialSearch} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full bg-white px-6 py-12 font-sans">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-12">
            <div className="space-y-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-6 w-72" />
            </div>
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
