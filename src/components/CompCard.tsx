import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ListingMatch } from "@/lib/estimate";
import { cn } from "@/lib/utils";

const PLATFORM_STYLES: Record<string, string> = {
  depop: "bg-pink-100 text-pink-700",
  ebay: "bg-yellow-100 text-yellow-800",
  grailed: "bg-zinc-900 text-white",
  poshmark: "bg-red-100 text-red-700",
};

function formatPrice(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatSoldDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatCondition(condition: string) {
  return condition.replace(/_/g, " ");
}

type CompCardProps = {
  comp: ListingMatch;
};

export function CompCard({ comp }: CompCardProps) {
  const platformStyle =
    PLATFORM_STYLES[comp.platform.toLowerCase()] ??
    "bg-zinc-100 text-zinc-700";

  const card = (
    <Card
      size="sm"
      className={cn(
        "h-full border-zinc-200 shadow-none",
        comp.listing_url && "transition-colors hover:border-zinc-300 hover:bg-zinc-50",
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm leading-snug">
            {comp.item_name}
          </CardTitle>
          <Badge
            className={cn("shrink-0 capitalize", platformStyle)}
            variant="outline"
          >
            {comp.platform}
          </Badge>
        </div>
        <CardDescription className="text-xs">{comp.brand}</CardDescription>
      </CardHeader>
      <CardContent className="flex h-full flex-col space-y-2 text-xs text-zinc-600">
        <p className="text-xl font-semibold tracking-tight text-zinc-900">
          {formatPrice(comp.sold_price)}
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <span className="capitalize">{formatCondition(comp.condition)}</span>
          {comp.size && (
            <>
              <span className="text-zinc-300">·</span>
              <span>Size {comp.size}</span>
            </>
          )}
          <span className="text-zinc-300">·</span>
          <span>{formatSoldDate(comp.sold_date)}</span>
        </div>
        <p className="text-zinc-500">
          {Math.round(comp.similarity * 100)}% match
        </p>
        {comp.listing_url && (
          <p className="mt-auto pt-1 text-right text-xs text-blue-600">
            View listing →
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (comp.listing_url) {
    return (
      <a
        href={comp.listing_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {card}
      </a>
    );
  }

  return card;
}
