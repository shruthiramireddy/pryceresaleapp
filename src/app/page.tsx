"use client";

import Link from "next/link";
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
};

type EstimateInsufficient = {
  insufficient: true;
  count: number;
};

type EstimateError = {
  type: "network" | "api";
  message: string;
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

type UrlSearch = {
  brand: string;
  itemName: string;
  condition: Condition;
};

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
      className="space-y-8"
      aria-busy="true"
      aria-label="Loading price estimate"
    >
      <div>
        <Skeleton className="mb-4 h-4 w-24" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="space-y-2 rounded-xl border border-zinc-200 p-4"
            >
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-9 w-20" />
            </div>
          ))}
        </div>
      </div>

      <Card className="border-zinc-200 shadow-none">
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </CardContent>
      </Card>

      <div>
        <Skeleton className="mb-4 h-4 w-36" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>

      <div>
        <Skeleton className="mb-4 h-4 w-44" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

function InsufficientState({
  count,
  brand,
  itemName,
  condition,
}: {
  count: number;
  brand: string;
  itemName: string;
  condition: Condition;
}) {
  const conditionLabel = condition.replace(/_/g, " ");

  return (
    <Card className="border-amber-200 bg-amber-50 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg text-amber-950">
          Not enough comparable sales
        </CardTitle>
        <CardDescription className="text-amber-800/80">
          Found {count} listing{count === 1 ? "" : "s"} for{" "}
          <span className="font-medium text-amber-950">
            {brand} · {itemName}
          </span>{" "}
          in <span className="capitalize">{conditionLabel}</span> condition. We
          need at least 3 to estimate a reliable price range.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-amber-900">
        <p className="font-medium">Try adjusting your search:</p>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <span className="text-amber-600">•</span>
            <span>Use a shorter or more generic item name (e.g. &quot;501 Jeans&quot; instead of a full product title)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-600">•</span>
            <span>Try a nearby condition — many brands only have comps for &quot;good&quot; or &quot;like new&quot;</span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-600">•</span>
            <span>Double-check the brand spelling</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: EstimateError;
  onRetry: () => void;
}) {
  const isNetwork = error.type === "network";

  return (
    <Card className="border-red-200 bg-red-50 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg text-red-950">
          {isNetwork ? "Connection problem" : "Something went wrong"}
        </CardTitle>
        <CardDescription className="text-red-800/80">
          {isNetwork
            ? "We couldn't reach the server. Check your internet connection and try again."
            : error.message}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="outline"
          className="border-red-300 bg-white text-red-900 hover:bg-red-100"
          onClick={onRetry}
        >
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

function parseEstimateError(submitError: unknown): EstimateError {
  if (
    submitError instanceof TypeError ||
    (submitError instanceof Error && submitError.message === "Failed to fetch")
  ) {
    return {
      type: "network",
      message: "Network request failed.",
    };
  }

  if (
    submitError instanceof Error &&
    submitError.message !== "Something went wrong. Please try again."
  ) {
    return {
      type: "api",
      message: submitError.message,
    };
  }

  return {
    type: "api",
    message: "Something went wrong. Please try again.",
  };
}

function EstimatePage({ initialSearch }: { initialSearch: UrlSearch | null }) {
  const [brand, setBrand] = useState(initialSearch?.brand ?? "");
  const [itemName, setItemName] = useState(initialSearch?.itemName ?? "");
  const [condition, setCondition] = useState<Condition>(
    initialSearch?.condition ?? "good",
  );
  const [loading, setLoading] = useState(Boolean(initialSearch));
  const [error, setError] = useState<EstimateError | null>(null);
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
              : response.status >= 500
                ? "The server encountered an error. Please try again shortly."
                : "Invalid request. Check your search and try again.";
          throw new Error(message);
        }

        setResult(data as EstimateSuccess | EstimateInsufficient);
      } catch (submitError) {
        setError(parseEstimateError(submitError));
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

  function handleRetry() {
    void runEstimate({ brand, itemName, condition });
  }

  return (
    <div className="min-h-full bg-white text-zinc-900">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-16">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight">Pryce</h1>
              <p className="text-lg text-zinc-500">
                Find out what your clothes are actually worth
              </p>
            </div>
            <Link
              href="/history"
              className="shrink-0 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
            >
              History
            </Link>
          </div>
        </header>

        <Card className="border-zinc-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Search sold listings</CardTitle>
            <CardDescription>
              Compare recent sales to estimate your resale price.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          <ErrorState error={error} onRetry={handleRetry} />
        )}

        {insufficientResult && !loading && (
          <InsufficientState
            count={insufficientResult.count}
            brand={brand}
            itemName={itemName}
            condition={condition}
          />
        )}

        {successResult && !loading && (
          <section className="space-y-8">
            <div>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
                Price range
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-sm text-zinc-500">P10</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">
                    {formatPrice(successResult.stats.p10)}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Median</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">
                    {formatPrice(successResult.stats.median)}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-sm text-zinc-500">P90</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">
                    {formatPrice(successResult.stats.p90)}
                  </p>
                </div>
              </div>
            </div>

            {successResult.aiSummary && (
              <Card className="border-zinc-200 shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">AI recommendation</CardTitle>
                  <CardDescription>
                    Based on {successResult.stats.count} comparable sales
                    {successResult.cached ? " (cached)" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-3xl font-semibold tracking-tight">
                      {formatPrice(
                        successResult.aiSummary.price_recommendation,
                      )}
                    </p>
                    <Badge variant="secondary" className="capitalize">
                      {successResult.aiSummary.confidence} confidence
                    </Badge>
                  </div>

                  <p className="text-zinc-600">
                    {successResult.aiSummary.market_context}
                  </p>

                  <ul className="space-y-2 text-sm text-zinc-700">
                    {successResult.aiSummary.sell_tips.map((tip) => (
                      <li key={tip} className="flex gap-2">
                        <span className="text-zinc-400">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
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
        <div className="min-h-full bg-white px-6 py-16">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
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
