import seedData from "./seed-data.json";
import { db } from "./index";
import { listings } from "./schema";

const BATCH_SIZE = 50;

type SeedListing = {
  brand: string;
  item_name: string;
  category: string;
  condition: string;
  sold_price: number;
  platform: string;
  sold_date: string;
  size: string;
};

async function seed() {
  const records = seedData as SeedListing[];
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  console.log(`Seeding ${records.length} listings in ${totalBatches} batches...`);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    await db.insert(listings).values(
      batch.map((record) => ({
        brand: record.brand,
        item_name: record.item_name,
        category: record.category,
        condition: record.condition,
        sold_price: String(record.sold_price),
        platform: record.platform,
        sold_date: record.sold_date,
        size: record.size,
      })),
    );

    const inserted = Math.min(i + BATCH_SIZE, records.length);
    console.log(
      `Batch ${batchNumber}/${totalBatches}: inserted ${batch.length} records (${inserted}/${records.length} total)`,
    );
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  if (error instanceof Error && "cause" in error && error.cause) {
    console.error("Cause:", error.cause);
  }
  process.exit(1);
});
