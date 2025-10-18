// src/lib/talent.ts
import { FirecrawlJobSchema, JobsResponseSchema, type FirecrawlJob, type JobsResponse, type Provider } from "./schemas";

export interface Env {
  SERPAPI_API_KEY: string;    // serpapi.com - now required
  USAGE_TRACKER: KVNamespace;
  DB: D1Database;
}

function parseCurrencyRange(raw?: string) {
  if (!raw) return {};
  const currencyMatch = raw.match(/\b(USD|EUR|GBP|AUD|CAD|SGD|JPY|\$|£|€|¥)\b/i);
  const currency =
    currencyMatch?.[0] === "$"
      ? "USD"
      : currencyMatch?.[0]?.toUpperCase().replace("€", "EUR").replace("¥", "JPY") || "USD";
  const nums = Array.from(raw.matchAll(/(\d[\d,]*\.?\d*)/g)).map((m) =>
    Number(m[1]?.replace(/,/g, "") || "0")
  );
  nums.sort((a, b) => a - b);
  if (!nums.length) return { salary_currency: currency, salary_raw: raw };
  return {
    salary_min: nums[0],
    salary_max: nums[nums.length - 1],
    salary_currency: currency,
    salary_raw: raw,
  };
}

// --- MAPPERS ---------------------------------------------------------------

export function mapSerpApiResultToFirecrawl(r: any): FirecrawlJob | null {
  // SerpAPI Google Jobs returns different structure than before
  const exts: any = r?.detected_extensions || {};
  const salaryRaw = exts?.salary || r?.salary;

  let posted_date: string | undefined;
  if (r?.date && /^\d{4}-\d{2}-\d{2}/.test(r.date)) {
    const d = new Date(r.date);
    if (!Number.isNaN(d.getTime())) posted_date = d.toISOString();
  }

  // Handle employment type from extensions or detected_extensions
  let employment_type: string | undefined;
  if (Array.isArray(r?.extensions)) {
    employment_type = r.extensions.find((x: string) =>
      /(full[-\s]?time|part[-\s]?time|contract|internship)/i.test(x)
    );
  } else if (exts?.schedule_type) {
    employment_type = exts.schedule_type;
  }

  const obj = {
    company_name: r?.company_name ?? r?.company,
    job_title: r?.title,
    job_location: r?.location,
    employment_type,
    ...parseCurrencyRange(typeof salaryRaw === "string" ? salaryRaw : r?.salary),
    job_description: r?.description,
    posted_date,
    source_url: r?.job_google_link || r?.apply_options?.[0]?.link || r?.link,
    url: r?.job_google_link || r?.apply_options?.[0]?.link || r?.link || "https://example.com",
  };

  const parsed = FirecrawlJobSchema.safeParse(obj);
  return parsed.success ? parsed.data : null;
}

// --- PROVIDERS -------------------------------------------------------------
export async function searchSerpApi(
  env: Env,
  q: string,
  location?: string,
  n?: number
): Promise<JobsResponse> {
  if (!env.SERPAPI_API_KEY) {
    return JobsResponseSchema.parse({ 
      provider: "serpapi", 
      count: 0, 
      results: [],
      error: "SERPAPI_API_KEY not configured"
    });
  }

  // Build the SerpAPI request URL
  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("q", q);
  url.searchParams.set("api_key", env.SERPAPI_API_KEY);
  
  // Add location if provided
  if (location) {
    url.searchParams.set("location", location);
  }

  try {
    const res = await fetch(url.toString());
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('SerpAPI request failed:', res.status, errorText);
      return JobsResponseSchema.parse({ 
        provider: "serpapi", 
        count: 0, 
        results: [],
        error: `SerpAPI request failed: ${res.status}`
      });
    }

    const data = await res.json<any>();
    
    // Handle SerpAPI response structure
    const raw = (data?.jobs_results ?? []) as any[];
    const top = typeof n === "number" ? raw.slice(0, n) : raw;
    const mapped = top.map(mapSerpApiResultToFirecrawl).filter(Boolean) as FirecrawlJob[];

    return JobsResponseSchema.parse({ 
      provider: "serpapi", 
      count: mapped.length, 
      results: mapped 
    });

  } catch (error) {
    console.error('Error fetching from SerpAPI:', error);
    return JobsResponseSchema.parse({ 
      provider: "serpapi", 
      count: 0, 
      results: [],
      error: 'Internal error fetching from SerpAPI'
    });
  }
}

// Main search function - now only uses SerpAPI
export async function searchJobs(
  env: Env,
  q: string,
  location?: string,
  n?: number,
  provider?: Provider
): Promise<JobsResponse> {
  // Always use SerpAPI since Google Jobs Search API is discontinued
  return searchSerpApi(env, q, location, n);
}