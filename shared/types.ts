export interface Job {
  id: number;
  name: string;
  type: 'scrape' | 'amazon-orders' | 'snaptrade';
  url: string | null;
  frequency_hours: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_run_at?: string | null;
  next_run_at?: string | null;
}

export interface Run {
  id: number;
  job_id: number;
  started_at: string;
  completed_at: string | null;
  status: 'pending' | 'running' | 'success' | 'failed';
  output_file: string | null;
  screenshot_file: string | null;
  error_message: string | null;
  products_found: number | null;
  trigger: 'scheduled' | 'manual';
}

export interface Result {
  id: number;
  run_id: number;
  data: Record<string, any>;
  created_at: string;
}

export interface FileRecord {
  id: number;
  hash: string;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface ScraperResult {
  data: Record<string, any>;
  productsFound: number;
}
