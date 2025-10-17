/**
 * Validation schemas using Zod for type-safe request/response validation
 */
import { z } from "zod";
// Job Site enum validation - matches the actual JobSite enum from steel library
export const JobSiteSchema = z.enum([
    "linkedin",
    "indeed",
    "glassdoor",
    "ziprecruiter",
    "naukri",
    "bdjobs",
    "bayt",
    "google",
]);
// Search parameters validation
export const SearchParamsSchema = z.object({
    keywords: z.string().min(1, "Keywords are required"),
    location: z.string().optional(),
    salaryMin: z.number().positive().optional(),
    salaryMax: z.number().positive().optional(),
    employmentType: z
        .enum(["full-time", "part-time", "contract", "internship"])
        .optional(),
    experienceLevel: z.enum(["entry", "mid", "senior", "executive"]).optional(),
    remote: z.boolean().optional(),
    postedWithin: z
        .enum(["1day", "3days", "1week", "2weeks", "1month"])
        .optional(),
    limit: z.number().int().min(1).max(100).optional(),
});
// Credentials validation for authenticated sites
export const CredentialsSchema = z.object({
    site: JobSiteSchema,
    email: z.string().email().optional(),
    password: z.string().min(1, "Password is required").optional(),
    username: z.string().min(1, "Username is required").optional(),
    apiKey: z.string().optional(),
    cookies: z.string().optional(),
});
// Job scraping request validation
export const ScrapeJobRequestSchema = z.object({
    jobUrl: z.string().url("Valid job URL is required"),
    credentials: CredentialsSchema.optional(),
});
// Search jobs request validation
export const SearchJobsRequestSchema = z.object({
    searchParams: SearchParamsSchema,
    credentials: CredentialsSchema.optional(),
});
// Scrape jobs request validation
export const ScrapeJobsRequestSchema = z.object({
    searchParams: SearchParamsSchema,
    batchSize: z.number().int().min(1).max(50).default(5),
    credentials: CredentialsSchema.optional(),
});
// Bulk scrape request validation
export const BulkScrapeRequestSchema = z.object({
    sites: z
        .array(z.object({
        site: JobSiteSchema,
        credentials: CredentialsSchema.optional(),
    }))
        .min(1, "At least one site is required"),
    searchParams: SearchParamsSchema,
    batchSize: z.number().int().min(1).max(20).default(3),
});
// Job data validation for D1 insertion
export const JobDataSchema = z.object({
    id: z.string().uuid(),
    site_id: z.string().min(1),
    url: z.string().url(),
    canonical_url: z.string().url().optional(),
    title: z.string().min(1),
    company: z.string().min(1),
    location: z.string().optional(),
    employment_type: z.string().optional(),
    department: z.string().optional(),
    salary_min: z.number().int().positive().optional(),
    salary_max: z.number().int().positive().optional(),
    salary_currency: z.string().length(3).optional(),
    salary_raw: z.string().optional(),
    compensation_raw: z.string().optional(),
    description_md: z.string().optional(),
    requirements_md: z.string().optional(),
    posted_at: z.string().datetime().optional(),
    closed_at: z.string().datetime().optional(),
    status: z.enum(["open", "closed", "paused"]).default("open"),
    last_seen_open_at: z.string().datetime().optional(),
    first_seen_at: z
        .string()
        .datetime()
        .default(() => new Date().toISOString()),
    last_crawled_at: z.string().datetime().optional(),
    daily_monitoring_enabled: z.boolean().default(true),
    monitoring_frequency_hours: z.number().int().min(1).max(168).default(24),
    last_status_check_at: z.string().datetime().optional(),
    closure_detected_at: z.string().datetime().optional(),
});
// Snapshot data validation for D1 insertion
export const SnapshotDataSchema = z.object({
    id: z.string().uuid(),
    job_id: z.string().uuid(),
    run_id: z.string().optional(),
    content_hash: z.string().min(1),
    html_r2_key: z.string().optional(),
    json_r2_key: z.string().optional(),
    screenshot_r2_key: z.string().optional(),
    pdf_r2_key: z.string().optional(),
    markdown_r2_key: z.string().optional(),
    fetched_at: z
        .string()
        .datetime()
        .default(() => new Date().toISOString()),
    http_status: z.number().int().min(100).max(599).optional(),
    etag: z.string().optional(),
});
// Job tracking history validation
export const JobTrackingHistorySchema = z.object({
    id: z.string().uuid(),
    job_id: z.string().uuid(),
    snapshot_id: z.string().uuid(),
    tracking_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    status: z.enum(["open", "closed", "modified", "error"]),
    content_hash: z.string().optional(),
    title_changed: z.boolean().default(false),
    requirements_changed: z.boolean().default(false),
    salary_changed: z.boolean().default(false),
    description_changed: z.boolean().default(false),
    error_message: z.string().optional(),
    created_at: z
        .string()
        .datetime()
        .default(() => new Date().toISOString()),
});
// Response schemas for API consistency
export const JobResponseSchema = z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    url: z.string(),
    description: z.string().optional(),
    salary: z.string().optional(),
    postedAt: z.string().optional(),
});
export const ScrapeResultSchema = z.object({
    jobId: z.string(),
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    url: z.string(),
    snapshotId: z.string(),
});
export const BulkScrapeResultSchema = z.object({
    site: JobSiteSchema,
    success: z.boolean(),
    totalFound: z.number().int().min(0).optional(),
    totalScraped: z.number().int().min(0).optional(),
    jobs: z.array(ScrapeResultSchema).optional(),
    error: z.string().optional(),
    message: z.string().optional(),
});
export const BulkScrapeResponseSchema = z.object({
    summary: z.object({
        totalSites: z.number().int().min(0),
        successfulSites: z.number().int().min(0),
        totalJobsScraped: z.number().int().min(0),
    }),
    results: z.array(BulkScrapeResultSchema),
});
// Browser Rendering validation schemas
export const ScreenshotOptionsSchema = z.object({
    fullPage: z.boolean().optional(),
    omitBackground: z.boolean().optional(),
    quality: z.number().min(0).max(100).optional(),
    type: z.enum(["png", "jpeg"]).optional(),
    clip: z
        .object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
    })
        .optional(),
});
export const ViewportOptionsSchema = z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    deviceScaleFactor: z.number().positive().optional(),
    isMobile: z.boolean().optional(),
    hasTouch: z.boolean().optional(),
    isLandscape: z.boolean().optional(),
});
export const GotoOptionsSchema = z.object({
    waitUntil: z
        .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
        .optional(),
    timeout: z.number().positive().optional(),
});
export const ScrapeElementSchema = z.object({
    selector: z.string().min(1),
    attribute: z.string().optional(),
    text: z.boolean().optional(),
    html: z.boolean().optional(),
});
export const AuthenticationOptionsSchema = z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
    cookies: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
});
export const BrowserRenderingOptionsSchema = z.object({
    url: z.string().url().optional(),
    html: z.string().optional(),
    userAgent: z.string().optional(),
    viewport: ViewportOptionsSchema.optional(),
    screenshotOptions: ScreenshotOptionsSchema.optional(),
    gotoOptions: GotoOptionsSchema.optional(),
    authenticate: AuthenticationOptionsSchema.optional(),
    rejectResourceTypes: z.array(z.string()).optional(),
    rejectRequestPattern: z.array(z.string()).optional(),
    allowResourceTypes: z.array(z.string()).optional(),
    allowRequestPattern: z.array(z.string()).optional(),
    visibleLinksOnly: z.boolean().optional(),
    addScriptTag: z
        .array(z.object({
        content: z.string().optional(),
        url: z.string().optional(),
    }))
        .optional(),
    addStyleTag: z
        .array(z.object({
        content: z.string().optional(),
        url: z.string().optional(),
    }))
        .optional(),
    setJavaScriptEnabled: z.boolean().optional(),
});
// Browser Rendering request schemas
export const ScreenshotRequestSchema = z.object({
    options: BrowserRenderingOptionsSchema,
});
export const ContentRequestSchema = z.object({
    options: BrowserRenderingOptionsSchema,
});
export const PdfRequestSchema = z.object({
    options: BrowserRenderingOptionsSchema,
});
export const ScrapeRequestSchema = z.object({
    options: BrowserRenderingOptionsSchema,
    elements: z.array(ScrapeElementSchema).min(1),
});
export const MarkdownRequestSchema = z.object({
    options: BrowserRenderingOptionsSchema,
});
export const JsonRequestSchema = z.object({
    options: BrowserRenderingOptionsSchema,
    prompt: z.string().min(1),
    responseFormat: z.object({
        type: z.literal("json_schema"),
        schema: z.any(),
    }),
});
export const LinksRequestSchema = z.object({
    options: BrowserRenderingOptionsSchema,
});
export const SnapshotRequestSchema = z.object({
    options: BrowserRenderingOptionsSchema,
});
export const ComprehensiveScrapeRequestSchema = z.object({
    url: z.string().url(),
    includeHtml: z.boolean().default(true),
    includeScreenshot: z.boolean().default(true),
    includePdf: z.boolean().default(false),
    includeMarkdown: z.boolean().default(true),
    includeJson: z.boolean().default(false),
    includeLinks: z.boolean().default(true),
    includeSnapshot: z.boolean().default(false),
    includeScraped: z.boolean().default(false),
    scrapeElements: z.array(ScrapeElementSchema).optional(),
    jsonPrompt: z.string().optional(),
    jsonSchema: z.any().optional(),
    authentication: AuthenticationOptionsSchema.optional(),
    viewport: ViewportOptionsSchema.optional(),
    screenshotOptions: ScreenshotOptionsSchema.optional(),
    gotoOptions: GotoOptionsSchema.optional(),
    jobId: z.string().uuid().optional(),
    siteId: z.string().optional(),
});
// Browser Rendering response schemas
export const BrowserRenderingResultSchema = z.object({
    id: z.string().uuid(),
    url: z.string().url(),
    timestamp: z.string().datetime(),
    html: z
        .object({
        r2Key: z.string(),
        r2Url: z.string(),
        size: z.number(),
    })
        .optional(),
    screenshot: z
        .object({
        r2Key: z.string(),
        r2Url: z.string(),
        size: z.number(),
    })
        .optional(),
    pdf: z
        .object({
        r2Key: z.string(),
        r2Url: z.string(),
        size: z.number(),
    })
        .optional(),
    markdown: z
        .object({
        r2Key: z.string(),
        r2Url: z.string(),
        size: z.number(),
    })
        .optional(),
    json: z
        .object({
        r2Key: z.string(),
        r2Url: z.string(),
        size: z.number(),
        data: z.any(),
    })
        .optional(),
    links: z
        .object({
        r2Key: z.string(),
        r2Url: z.string(),
        size: z.number(),
        links: z.array(z.string()),
    })
        .optional(),
    snapshot: z
        .object({
        r2Key: z.string(),
        r2Url: z.string(),
        size: z.number(),
        screenshot: z.string(),
        content: z.string(),
    })
        .optional(),
    scraped: z
        .object({
        r2Key: z.string(),
        r2Url: z.string(),
        size: z.number(),
        results: z.array(z.object({
            selector: z.string(),
            results: z.array(z.object({
                text: z.string(),
                html: z.string(),
                attributes: z.record(z.string(), z.string()),
                height: z.number(),
                width: z.number(),
                top: z.number(),
                left: z.number(),
            })),
        })),
    })
        .optional(),
    httpStatus: z.number().int().min(100).max(599).optional(),
    error: z.string().optional(),
});
// Error response schema
export const ErrorResponseSchema = z.object({
    error: z.string(),
    details: z.string().optional(),
    code: z.string().optional(),
});
