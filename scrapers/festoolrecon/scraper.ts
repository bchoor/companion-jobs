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

      // Get description
      const descElement = document.querySelector(
        '[data-section-type="product"] [class*="description"]'
      );
      let description = "";
      if (descElement) {
        description = descElement.textContent?.trim() || "";
      } else {
        const allText = (
          document.querySelector(
            '[data-section-type="product"]'
          ) as HTMLElement | null
        )?.innerText;
        if (allText) {
          const lines = allText.split("\n");
          const addToCartIdx = lines.findIndex((l) =>
            l.includes("ADD TO CART")
          );
          if (addToCartIdx > -1 && addToCartIdx < lines.length - 1) {
            description = lines
              .slice(addToCartIdx + 1)
              .join(" ")
              .trim();
          }
        }
      }

      // Parse features and includes from page HTML
      let features: string[] = [];
      let whatsIncluded: string[] = [];

      const productSection = document.querySelector(
        '[data-section-type="product"]'
      );
      if (productSection) {
        const ulElements = productSection.querySelectorAll("ul, ol");

        let featureList: Element | undefined;
        let includesList: Element | undefined;

        if (ulElements.length >= 2) {
          featureList = ulElements[0];
          includesList = ulElements[1];
        } else if (ulElements.length === 1) {
          featureList = ulElements[0];
        }

        if (featureList) {
          const lis = featureList.querySelectorAll("li");
          features = Array.from(lis)
            .map((li) => li.textContent?.trim() || "")
            .filter(
              (text) => text.length > 0 && !text.includes("ADD TO CART")
            );
        }

        if (includesList) {
          const lis = includesList.querySelectorAll("li");
          whatsIncluded = Array.from(lis)
            .map((li) => li.textContent?.trim() || "")
            .filter((text) => text.length > 0);
        } else {
          const allText =
            (productSection as HTMLElement).innerText || "";
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
      }

      // Get SKU
      let sku: string | null = null;
      const productContent = document.querySelector(
        '[data-section-type="product"]'
      );
      if (productContent) {
        const text = (productContent as HTMLElement).innerText || "";
        const skuMatch = text.match(/Item:\s*(\d+)/i);
        if (skuMatch) {
          sku = skuMatch[1];
        }
      }

      return {
        productName,
        msrp,
        discountedPrice,
        description: description.substring(0, 1000),
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
