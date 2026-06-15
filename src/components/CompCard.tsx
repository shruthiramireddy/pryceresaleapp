import type { ListingMatch } from "@/lib/estimate";
import { cn } from "@/lib/utils";

const ACCENT = "#FF4D00";

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
    day: "numeric",
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
  const card = (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border-2 border-black bg-white p-4 transition-shadow hover:shadow-lg",
        comp.listing_url && "cursor-pointer",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-bold leading-tight">
          {comp.item_name}
        </p>
        <span className="shrink-0 rounded-full bg-black px-2 py-1 text-xs font-bold uppercase text-white">
          {comp.platform}
        </span>
      </div>

      <p
        className="text-2xl font-black leading-none"
        style={{ color: ACCENT }}
      >
        {formatPrice(comp.sold_price)}
      </p>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-xs capitalize text-zinc-500">
          {formatCondition(comp.condition)}
        </p>
        <p className="text-right text-xs text-zinc-500">
          {formatSoldDate(comp.sold_date)}
        </p>
      </div>

      {comp.listing_url && (
        <p
          className="mt-auto pt-3 text-right text-xs font-bold"
          style={{ color: ACCENT }}
        >
          VIEW ON EBAY →
        </p>
      )}
    </div>
  );

  if (comp.listing_url) {
    return (
      <a
        href={comp.listing_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4D00]"
      >
        {card}
      </a>
    );
  }

  return card;
}
