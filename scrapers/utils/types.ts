export interface ScraperResult {
  screenshotFile: string | null;
  productsFound: number;
  data: unknown;
}

export interface Job {
  id: number;
  name: string;
  url: string;
  frequency_hours: number;
  enabled: number;
  config: string;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: number;
  job_id: number;
  started_at: string;
  completed_at: string | null;
  status: "pending" | "running" | "success" | "failed";
  output_file: string | null;
  screenshot_file: string | null; // SHA-256 hash (content-addressed store key)
  error_message: string | null;
  products_found: number;
}
