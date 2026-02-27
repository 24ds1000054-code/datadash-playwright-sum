// scripts/sumTables.js
import { chromium } from "@playwright/test";

/**
 * Parse and sum all numbers from text.
 * Supports negatives, decimals, and comma-separated thousands (e.g., 1,234.56).
 */
function sumNumbersFromText(text) {
  const re = /-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|-?\.\d+/g;
  const matches = text.match(re) ?? [];
  let sum = 0;

  for (const m of matches) {
    const val = Number(m.replace(/,/g, ""));
    if (Number.isFinite(val)) sum += val;
  }
  return sum;
}

/**
 * Extract all text from all tables (td/th) and sum numeric values.
 */
async function sumAllTablesOnPage(page) {
  const tableText = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    return tables
      .map((t) => {
        const cells = Array.from(t.querySelectorAll("td,th"));
        const txt = cells.length
          ? cells.map((c) => (c.textContent ?? "").trim()).join(" ")
          : (t.textContent ?? "");
        return txt;
      })
      .join(" ");
  });

  return sumNumbersFromText(tableText);
}

async function main() {
  const base = "https://sanand0.github.io/tdsdata/js_table/?seed=";
  const seeds = Array.from({ length: 10 }, (_, i) => 75 + i); // 75..84
  const urls = seeds.map((s) => `${base}${s}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let grandTotal = 0;

  for (const url of urls) {
    console.log(`Visiting: ${url}`);

    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });

    // Page is JS-rendered; ensure tables exist before scraping.
    await page.waitForSelector("table", { timeout: 60_000 });

    const pageSum = await sumAllTablesOnPage(page);
    console.log(`PAGE_SUM ${url} = ${pageSum}`);

    grandTotal += pageSum;
  }

  await browser.close();

  console.log("================================");
  console.log(`FINAL_TOTAL = ${grandTotal}`);
  console.log("================================");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
