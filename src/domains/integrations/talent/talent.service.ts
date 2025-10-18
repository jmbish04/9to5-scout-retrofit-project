/**
 * @fileoverview Talent API Integration Service
 *
 * Provides comprehensive job search functionality using SerpAPI for Google Jobs.
 * Handles job search, filtering, salary parsing, and result mapping.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Talent service environment interface
 */
export interface TalentServiceEnv {
  SERPAPI_API_KEY: string;
  USAGE_TRACKER: KVNamespace;
  DB: D1Database;
}

/**
 * Job search result interface
 */
export interface JobSearchResult {
  company_name: string;
  job_title: string;
  job_location: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_raw?: string;
  job_description?: string;
  posted_date?: string;
  source_url: string;
  url: string;
}

/**
 * Job search response interface
 */
export interface JobSearchResponse {
  provider: string;
  count: number;
  results: JobSearchResult[];
  error?: string;
  query: string;
  location?: string;
  timestamp: string;
}

/**
 * Job search parameters interface
 */
export interface JobSearchParams {
  query: string;
  location?: string;
  limit?: number;
  salary_min?: number;
  salary_max?: number;
  employment_type?: string;
  date_posted?: "today" | "week" | "month" | "any";
  remote?: boolean;
  company?: string;
}

/**
 * Salary range parsing result
 */
export interface SalaryRange {
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  salary_raw: string;
}

/**
 * Talent Service Class
 *
 * Provides comprehensive job search functionality using SerpAPI for Google Jobs.
 * Handles job search, filtering, salary parsing, and result mapping.
 */
export class TalentService {
  private env: TalentServiceEnv;

  constructor(env: TalentServiceEnv) {
    this.env = env;
  }

  /**
   * Parse currency range from raw salary text
   * @param raw Raw salary text
   * @returns Parsed salary range information
   */
  private parseCurrencyRange(raw?: string): SalaryRange {
    if (!raw) return { salary_currency: "USD", salary_raw: "" };

    const currencyMatch = raw.match(
      /\b(USD|EUR|GBP|AUD|CAD|SGD|JPY|\$|£|€|¥)\b/i
    );
    const currency =
      currencyMatch?.[0] === "$"
        ? "USD"
        : currencyMatch?.[0]
            ?.toUpperCase()
            .replace("€", "EUR")
            .replace("¥", "JPY") || "USD";

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

  /**
   * Map SerpAPI result to standardized job format
   * @param result Raw SerpAPI result
   * @returns Mapped job result or null if invalid
   */
  private mapSerpApiResultToJob(result: any): JobSearchResult | null {
    try {
      const exts: any = result?.detected_extensions || {};
      const salaryRaw = exts?.salary || result?.salary;

      let posted_date: string | undefined;
      if (result?.date && /^\d{4}-\d{2}-\d{2}/.test(result.date)) {
        const d = new Date(result.date);
        if (!Number.isNaN(d.getTime())) posted_date = d.toISOString();
      }

      // Handle employment type from extensions or detected_extensions
      let employment_type: string | undefined;
      if (Array.isArray(result?.extensions)) {
        employment_type = result.extensions.find((x: string) =>
          /(full[-\s]?time|part[-\s]?time|contract|internship)/i.test(x)
        );
      } else if (exts?.schedule_type) {
        employment_type = exts.schedule_type;
      }

      const salaryInfo = this.parseCurrencyRange(
        typeof salaryRaw === "string" ? salaryRaw : result?.salary
      );

      const job: JobSearchResult = {
        company_name: result?.company_name ?? result?.company ?? "",
        job_title: result?.title ?? "",
        job_location: result?.location ?? "",
        employment_type,
        ...salaryInfo,
        job_description: result?.description,
        posted_date,
        source_url:
          result?.job_google_link ||
          result?.apply_options?.[0]?.link ||
          result?.link ||
          "",
        url:
          result?.job_google_link ||
          result?.apply_options?.[0]?.link ||
          result?.link ||
          "https://example.com",
      };

      // Validate required fields
      if (!job.company_name || !job.job_title || !job.url) {
        return null;
      }

      return job;
    } catch (error) {
      console.error("Error mapping SerpAPI result:", error);
      return null;
    }
  }

  /**
   * Search jobs using SerpAPI
   * @param params Search parameters
   * @returns Promise resolving to job search results
   */
  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      if (!this.env.SERPAPI_API_KEY) {
        return {
          provider: "serpapi",
          count: 0,
          results: [],
          error: "SERPAPI_API_KEY not configured",
          query: params.query,
          location: params.location,
          timestamp: new Date().toISOString(),
        };
      }

      // Build the SerpAPI request URL
      const url = new URL("https://serpapi.com/search");
      url.searchParams.set("engine", "google_jobs");
      url.searchParams.set("q", params.query);
      url.searchParams.set("api_key", this.env.SERPAPI_API_KEY);

      // Add optional parameters
      if (params.location) {
        url.searchParams.set("location", params.location);
      }

      if (params.employment_type) {
        url.searchParams.set("employment_type", params.employment_type);
      }

      if (params.date_posted && params.date_posted !== "any") {
        url.searchParams.set("date_posted", params.date_posted);
      }

      if (params.remote) {
        url.searchParams.set("remote", "true");
      }

      if (params.company) {
        url.searchParams.set("company", params.company);
      }

      // Add salary filters if provided
      if (params.salary_min || params.salary_max) {
        const salaryRange = [];
        if (params.salary_min) salaryRange.push(`${params.salary_min}`);
        if (params.salary_max) salaryRange.push(`${params.salary_max}`);
        url.searchParams.set("salary", salaryRange.join("-"));
      }

      // Track API usage
      await this.trackUsage(params.query, params.location);

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        console.error("SerpAPI request failed:", response.status, errorText);
        return {
          provider: "serpapi",
          count: 0,
          results: [],
          error: `SerpAPI request failed: ${response.status}`,
          query: params.query,
          location: params.location,
          timestamp: new Date().toISOString(),
        };
      }

      const data = await response.json<any>();

      // Handle SerpAPI response structure
      const rawResults = (data?.jobs_results ?? []) as any[];
      const limitedResults = params.limit
        ? rawResults.slice(0, params.limit)
        : rawResults;
      const mappedResults = limitedResults
        .map((result) => this.mapSerpApiResultToJob(result))
        .filter((job): job is JobSearchResult => job !== null);

      return {
        provider: "serpapi",
        count: mappedResults.length,
        results: mappedResults,
        query: params.query,
        location: params.location,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error searching jobs:", error);
      return {
        provider: "serpapi",
        count: 0,
        results: [],
        error: "Internal error searching jobs",
        query: params.query,
        location: params.location,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Search jobs by company
   * @param company Company name
   * @param location Optional location filter
   * @param limit Maximum number of results
   * @returns Promise resolving to job search results
   */
  async searchJobsByCompany(
    company: string,
    location?: string,
    limit?: number
  ): Promise<JobSearchResponse> {
    return this.searchJobs({
      query: `jobs at ${company}`,
      location,
      limit,
      company,
    });
  }

  /**
   * Search jobs by skills
   * @param skills Array of skills
   * @param location Optional location filter
   * @param limit Maximum number of results
   * @returns Promise resolving to job search results
   */
  async searchJobsBySkills(
    skills: string[],
    location?: string,
    limit?: number
  ): Promise<JobSearchResponse> {
    const skillsQuery = skills.join(" ");
    return this.searchJobs({
      query: skillsQuery,
      location,
      limit,
    });
  }

  /**
   * Search remote jobs
   * @param query Search query
   * @param limit Maximum number of results
   * @returns Promise resolving to job search results
   */
  async searchRemoteJobs(
    query: string,
    limit?: number
  ): Promise<JobSearchResponse> {
    return this.searchJobs({
      query,
      remote: true,
      limit,
    });
  }

  /**
   * Search jobs with salary range
   * @param query Search query
   * @param salaryMin Minimum salary
   * @param salaryMax Maximum salary
   * @param location Optional location filter
   * @param limit Maximum number of results
   * @returns Promise resolving to job search results
   */
  async searchJobsWithSalary(
    query: string,
    salaryMin: number,
    salaryMax: number,
    location?: string,
    limit?: number
  ): Promise<JobSearchResponse> {
    return this.searchJobs({
      query,
      location,
      limit,
      salary_min: salaryMin,
      salary_max: salaryMax,
    });
  }

  /**
   * Get job details by URL
   * @param jobUrl Job posting URL
   * @returns Promise resolving to job details or null
   */
  async getJobDetails(jobUrl: string): Promise<JobSearchResult | null> {
    try {
      // For now, we'll return a basic job object
      // In a real implementation, you might scrape the job page or use another API
      return {
        company_name: "Unknown Company",
        job_title: "Job Title",
        job_location: "Unknown Location",
        source_url: jobUrl,
        url: jobUrl,
      };
    } catch (error) {
      console.error("Error getting job details:", error);
      return null;
    }
  }

  /**
   * Track API usage for monitoring
   * @param query Search query
   * @param location Search location
   */
  private async trackUsage(query: string, location?: string): Promise<void> {
    try {
      const usageKey = `talent_api_usage_${
        new Date().toISOString().split("T")[0]
      }`;
      const usageData = await this.env.USAGE_TRACKER.get(usageKey);

      const currentUsage = usageData
        ? JSON.parse(usageData)
        : {
            date: new Date().toISOString().split("T")[0],
            total_requests: 0,
            queries: [],
          };

      currentUsage.total_requests += 1;
      currentUsage.queries.push({
        query,
        location,
        timestamp: new Date().toISOString(),
      });

      await this.env.USAGE_TRACKER.put(usageKey, JSON.stringify(currentUsage));
    } catch (error) {
      console.error("Error tracking usage:", error);
    }
  }

  /**
   * Get usage statistics
   * @param date Optional date to get usage for (YYYY-MM-DD format)
   * @returns Promise resolving to usage statistics
   */
  async getUsageStats(date?: string): Promise<{
    date: string;
    total_requests: number;
    queries: Array<{
      query: string;
      location?: string;
      timestamp: string;
    }>;
  } | null> {
    try {
      const targetDate = date || new Date().toISOString().split("T")[0];
      const usageKey = `talent_api_usage_${targetDate}`;
      const usageData = await this.env.USAGE_TRACKER.get(usageKey);

      if (!usageData) {
        return null;
      }

      return JSON.parse(usageData);
    } catch (error) {
      console.error("Error getting usage stats:", error);
      return null;
    }
  }
}

/**
 * Factory function to create TalentService
 * @param env Talent service environment configuration
 * @returns New TalentService instance
 */
export function createTalentService(env: TalentServiceEnv): TalentService {
  return new TalentService(env);
}
