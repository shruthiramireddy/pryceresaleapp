const RAPIDAPI_URL =
  "https://ebay-average-selling-price.p.rapidapi.com/findCompletedItems";

export type EbaySoldListing = {
  brand: string;
  itemName: string;
  category: string;
  condition: string;
  soldPrice: number;
  platform: "ebay";
  soldDate: string;
  size: null;
  externalId: string;
  listingUrl: string;
};

type FetchEbaySoldListingsParams = {
  brand: string;
  itemName: string;
  condition: string;
};

type RapidApiProduct = {
  title: string;
  sale_price: number;
  date_sold: string;
  link: string;
};

function guessCategory(itemName: string): string {
  const name = itemName.toLowerCase();

  if (/jacket|coat|hoodie|puffer/.test(name)) return "outerwear";
  if (/pants|jeans|shorts|skirt/.test(name)) return "bottoms";
  if (/shoes|sneakers|boots/.test(name)) return "shoes";
  if (/bag|purse|wallet|belt|hat/.test(name)) return "accessories";
  return "tops";
}

function parseDateToISO(dateSold: string): string {
  const date = new Date(dateSold);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export async function fetchEbaySoldListings({
  brand,
  itemName,
  condition,
}: FetchEbaySoldListingsParams): Promise<EbaySoldListing[]> {
  try {
    const apiKey = process.env.RAPID_API_KEY;
    if (!apiKey) {
      return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch(RAPIDAPI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "ebay-average-selling-price.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
        body: JSON.stringify({
          keywords: `${brand} ${itemName}`,
          max_search_results: "60",
          remove_outliers: true,
          site_id: "0",
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { products?: RapidApiProduct[] };
    const products = data.products;

    if (!Array.isArray(products) || products.length === 0) {
      return [];
    }

    const category = guessCategory(itemName);

    return products
      .map((product): EbaySoldListing | null => {
        const { title, sale_price, date_sold, link } = product;

        if (!title || !link) {
          return null;
        }

        const soldPrice = Number(sale_price);
        if (soldPrice === 0 || Number.isNaN(soldPrice)) {
          return null;
        }

        const soldDate = parseDateToISO(date_sold);
        if (!soldDate) {
          return null;
        }

        return {
          brand,
          itemName: title,
          category,
          condition,
          soldPrice,
          platform: "ebay",
          soldDate,
          size: null,
          externalId: link,
          listingUrl: link,
        };
      })
      .filter((listing): listing is EbaySoldListing => listing !== null);
  } catch {
    return [];
  }
}
