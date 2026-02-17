import type { Page } from "playwright";
import { BaseScraper, type ExtractResult } from "../utils/base-scraper";
import type { Job } from "../utils/types";

interface ProductData {
  productName: string;
  msrp: string | null;
  discountedPrice: string | null;
  description: string | null;
  features: string[];
  whatsIncluded: string[];
  sku: string | null;
  scrapedAt: string;
}

class FestoolReconScraper extends BaseScraper {
  constructor() {
    super({
      slug: "festoolrecon",
      url: "https://festoolrecon.com",
      frequencyHours: 4,
      config: {
        selectors: {
          product: '[data-section-type="product"]',
          name: '[data-section-type="product"] h1',
          price: ".product-single__price-product-template",
        },
      },
    });
  }

  protected async extract(page: Page, _job: Job): Promise<ExtractResult> {
    const productData = await page.evaluate(() => {
      // ============================================================================
      // STEP 0: Extract basic product info (name, prices, SKU)
      // ============================================================================

      // Get product name
      const nameElement = document.querySelector(
        '[data-section-type="product"] h1'
      );
      const productName = nameElement?.textContent?.trim() || "";

      // Get prices
      let msrp: string | null = null;
      let discountedPrice: string | null = null;

      const priceElement = document.querySelector(
        ".product-single__price-product-template"
      );
      if (priceElement) {
        const priceText = priceElement.textContent || "";
        const priceMatches = priceText.match(/\$[\d,]+\.\d{2}/g);
        if (priceMatches && priceMatches.length >= 2) {
          msrp = priceMatches[0];
          discountedPrice = priceMatches[1];
        } else if (priceMatches && priceMatches.length === 1) {
          discountedPrice = priceMatches[0];
        }
      }

      // Get SKU
      let sku: string | null = null;
      const productSection = document.querySelector(
        '[data-section-type="product"]'
      );
      if (productSection) {
        const text = (productSection as HTMLElement).innerText || "";
        const skuMatch = text.match(/Item:\s*(\d+)/i);
        if (skuMatch) {
          sku = skuMatch[1];
        }
      }

      // ============================================================================
      // STEP 1: Extract content blocks from description element
      // ============================================================================

      interface ContentBlock {
        type: "list" | "paragraph" | "text";
        tag: string;           // "UL", "OL", "P", "#text", etc.
        text: string;          // textContent trimmed
        items: string[];       // for lists: each <li> text; for paragraphs: lines split by <br>
        position: number;      // index among siblings
        role?: "features" | "includes" | "description" | "skip";
      }

      const blocks: ContentBlock[] = [];
      const descElement = productSection?.querySelector(
        ".product-single__description.rte"
      );

      // Normalize whitespace for reliable comparisons
      function norm(s: string): string {
        return s.replace(/\s+/g, " ").trim();
      }

      // Extract a block from a DOM node
      function extractBlock(child: ChildNode, pos: number): ContentBlock | null {
        const tag = child.nodeName;
        const text = (child.textContent || "").trim();
        if (!text) return null;

        if (tag === "UL" || tag === "OL") {
          const items: string[] = [];
          const liElements = (child as Element).querySelectorAll("li");
          for (const li of liElements) {
            const liText = (li.textContent || "").trim();
            if (liText) items.push(liText);
          }
          return { type: "list", tag, text, items, position: pos };
        }

        if (tag === "P") {
          const html = (child as Element).innerHTML;
          const parts = html.split(/<br[^>]*\/?>/gi);
          const items = parts
            .map((part) => part.replace(/<[^>]*>/g, "").trim())
            .filter((item) => item.length > 0);
          return { type: "paragraph", tag, text, items, position: pos };
        }

        if (child.nodeType === Node.TEXT_NODE) {
          return { type: "text", tag: "#text", text, items: [text], position: pos };
        }

        return null;
      }

      if (descElement) {
        let position = 0;
        for (const child of descElement.childNodes) {
          const block = extractBlock(child, position);
          if (block) {
            blocks.push(block);
            position++;
            continue;
          }

          // Recurse into wrapper elements (DIV, SPAN, etc.) that aren't
          // directly recognized — their children may contain UL/OL/P content
          if (child.nodeType === Node.ELEMENT_NODE && child.childNodes.length > 0) {
            for (const grandchild of child.childNodes) {
              const inner = extractBlock(grandchild, position);
              if (inner) {
                blocks.push(inner);
                position++;
              }
            }
          }
        }
      }

      // ============================================================================
      // STEP 2: Classify each block
      // ============================================================================

      let listCount = 0;

      for (const block of blocks) {
        // Rule 1-3: Lists (1st = features, 2nd = includes, 3rd+ = description)
        if (block.type === "list") {
          listCount++;
          if (listCount === 1) {
            block.role = "features";
            continue;
          } else if (listCount === 2) {
            block.role = "includes";
            continue;
          } else {
            block.role = "description";
            continue;
          }
        }

        // Rule 4: Block text starts with "-"
        if (block.text.startsWith("-")) {
          block.role = "features";
          continue;
        }

        // Rule 5: Majority of items start with "-"
        const nonEmptyItems = block.items.filter((item) => item.length > 0);
        const dashPrefixedCount = nonEmptyItems.filter((item) =>
          item.trim().startsWith("-")
        ).length;
        if (
          nonEmptyItems.length > 0 &&
          dashPrefixedCount / nonEmptyItems.length > 0.5
        ) {
          block.role = "features";
          continue;
        }

        // Rule 6: SKU line (e.g., "Item: 123", "Item No: 123", "Item Number: 123")
        if (/^Item\s*(No|Number|#)?:?\s*\d+/i.test(block.text)) {
          block.role = "skip";
          continue;
        }

        // Rule 7: Section headers (e.g., "Includes:", "Features:")
        if (/^[A-Za-z]+:$/.test(block.text)) {
          block.role = "skip";
          continue;
        }

        // Rule 8: Default to description
        block.role = "description";
      }

      // ============================================================================
      // STEP 2b: Dedup — reclassify description blocks that duplicate feature content
      // ============================================================================

      // Collect normalized feature item texts from classified feature blocks
      const featureTexts: string[] = [];
      for (const block of blocks) {
        if (block.role === "features") {
          for (const item of block.items) {
            const cleaned = norm(item.replace(/^-\s*/, ""));
            if (cleaned.length > 10) featureTexts.push(cleaned);
          }
        }
      }

      // ============================================================================
      // STEP 3: Build outputs from classified blocks
      // ============================================================================

      let features: string[] = [];
      let whatsIncluded: string[] = [];
      const descriptionParts: string[] = [];

      // Helper: check if a text line duplicates a known feature
      function isDuplicateOfFeature(text: string): boolean {
        const n = norm(text);
        if (n.length < 10) return false;
        return featureTexts.some(
          (ft) => n.includes(ft) || ft.includes(n)
        );
      }

      for (const block of blocks) {
        if (block.role === "features") {
          if (block.type === "list") {
            features.push(...block.items);
          } else if (block.type === "paragraph") {
            for (const item of block.items) {
              // Handle the ".-" concatenation boundary
              if (item.startsWith("-") && /\.-[A-Z]/.test(item)) {
                const splits = item.split(/\.(?=-[A-Z])/);
                const processed = splits.map((s, i) =>
                  i < splits.length - 1 ? s + "." : s
                );
                for (const part of processed) {
                  const cleaned = part.trim().replace(/^-\s*/, "");
                  if (cleaned) features.push(cleaned);
                }
              } else {
                const cleaned = item.trim().replace(/^-\s*/, "");
                if (cleaned) features.push(cleaned);
              }
            }
          } else if (block.type === "text") {
            const cleaned = block.text.replace(/^-\s*/, "");
            if (cleaned) features.push(cleaned);
          }
        } else if (block.role === "includes") {
          whatsIncluded.push(...block.items);
        } else if (block.role === "description") {
          // Item-level dedup: filter out individual lines that match features
          const kept = block.items.filter((item) => !isDuplicateOfFeature(item));
          if (kept.length > 0) {
            descriptionParts.push(kept.join(" "));
          }
        }
        // Skip blocks with role "skip"
      }

      // Filter out "ADD TO CART" from features
      features = features.filter(
        (f) => f.trim().length > 0 && !f.includes("ADD TO CART")
      );

      // Filter out empty includes
      whatsIncluded = whatsIncluded.filter((item) => item.trim().length > 0);

      // Join description parts
      let description = descriptionParts.join("\n\n");

      // ============================================================================
      // STEP 4: Fallbacks
      // ============================================================================

      // Features fallback: use first <ul>/<ol> in product section
      if (features.length === 0 && productSection) {
        const firstList = productSection.querySelector("ul, ol");
        if (firstList) {
          const lis = firstList.querySelectorAll("li");
          features = Array.from(lis)
            .map((li) => (li.textContent || "").trim())
            .filter((text) => text.length > 0 && !text.includes("ADD TO CART"));
        }
      }

      // Includes fallback: regex on product section text
      if (whatsIncluded.length === 0 && productSection) {
        const allText = (productSection as HTMLElement).innerText || "";
        const match = allText.match(
          /Includes[:\s]+([\s\S]*?)(?:Part number|$)/i
        );
        if (match) {
          whatsIncluded = match[1]
            .split("\n")
            .map((line: string) => line.trim())
            .filter(
              (line: string) =>
                line.length > 0 && !line.match(/^[\s\u2022\-*]*$|^\d+$/)
            );
        }
      }

      // ============================================================================
      // STEP 5: Final cleanup and return
      // ============================================================================

      // Output-level safety: truncate description before any feature text
      // Catches edge cases where pipeline dedup missed due to DOM structure
      if (features.length > 0 && description) {
        let cutIndex = description.length;
        for (const f of features) {
          const idx = description.indexOf(f);
          if (idx >= 0 && idx < cutIndex) cutIndex = idx;
        }
        if (cutIndex < description.length) {
          description = description.substring(0, cutIndex).trim();
        }
      }

      // Truncate description to 1000 chars
      if (description.length > 1000) {
        description = description.substring(0, 1000);
      }

      return {
        productName,
        msrp,
        discountedPrice,
        description,
        features,
        whatsIncluded,
        sku,
      };
    });

    const product: ProductData = {
      ...productData,
      scrapedAt: new Date().toISOString(),
    };

    const output = {
      totalProducts: 1,
      products: [product],
      scrapedAt: new Date().toISOString(),
      source: this.def.url,
    };

    return {
      data: output,
      productsFound: output.totalProducts,
    };
  }
}

const scraper = new FestoolReconScraper();

scraper.execute().catch((err) => {
  console.error("[festoolrecon] Fatal:", err);
  process.exit(1);
});

export default scraper;
