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

  return (
    <Card size="sm" className="h-full border-zinc-200 shadow-none">
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
      <CardContent className="space-y-2 text-xs text-zinc-600">
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
      </CardContent>
    </Card>
  );
}
