// src/lib/talent.ts
import { FirecrawlJobSchema, JobsResponseSchema } from "./schemas";
function parseCurrencyRange(raw) {
    if (!raw)
        return {};
    const currencyMatch = raw.match(/\b(USD|EUR|GBP|AUD|CAD|SGD|JPY|\$|£|€|¥)\b/i);
    const currency = currencyMatch?.[0] === "$"
        ? "USD"
        : currencyMatch?.[0]?.toUpperCase().replace("€", "EUR").replace("¥", "JPY") || "USD";
    const nums = Array.from(raw.matchAll(/(\d[\d,]*\.?\d*)/g)).map((m) => Number(m[1]?.replace(/,/g, "") || "0"));
    nums.sort((a, b) => a - b);
    if (!nums.length)
        return { salary_currency: currency, salary_raw: raw };
    return {
        salary_min: nums[0],
        salary_max: nums[nums.length - 1],
        salary_currency: currency,
        salary_raw: raw,
    };
}
// --- MAPPERS ---------------------------------------------------------------
export function mapSerperResultToFirecrawl(r) {
    const exts = r?.extensions || [];
    const salaryRaw = exts.find((x) => /\$|salary|compensation/i.test(x));
    const employment = exts.find((x) => /(full[-\s]?time|part[-\s]?time|contract|internship)/i.test(x));
    let posted_date;
    // Only accept absolute dates we can safely ISO-ify
    if (r?.date && /^\d{4}-\d{2}-\d{2}/.test(r.date)) {
        const d = new Date(r.date);
        if (!Number.isNaN(d.getTime()))
            posted_date = d.toISOString();
    }
    const obj = {
        company_name: r?.companyName,
        job_title: r?.title,
        job_location: r?.location,
        employment_type: employment,
        ...parseCurrencyRange(salaryRaw),
        job_description: r?.description,
        posted_date,
        source_url: r?.jobGoogleLink || r?.link,
        url: r?.jobGoogleLink || r?.link || "https://example.com",
    };
    const parsed = FirecrawlJobSchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
}
export function mapSerpApiResultToFirecrawl(r) {
    const exts = r?.detected_extensions || {};
    const salaryRaw = exts?.salary ||
        (Array.isArray(r?.extensions)
            ? r.extensions.find((x) => /\$|salary|compensation/i.test(x))
            : undefined);
    let posted_date;
    if (r?.date && /^\d{4}-\d{2}-\d{2}/.test(r.date)) {
        const d = new Date(r.date);
        if (!Number.isNaN(d.getTime()))
            posted_date = d.toISOString();
    }
    const obj = {
        company_name: r?.company_name ?? r?.company,
        job_title: r?.title,
        job_location: r?.location,
        employment_type: Array.isArray(r?.extensions)
            ? r.extensions.find((x) => /(full[-\s]?time|part[-\s]?time|contract|internship)/i.test(x))
            : undefined,
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
export async function searchSerper(env, q, location, n) {
    if (!env.SERPER_API_KEY)
        return JobsResponseSchema.parse({ provider: "serper", count: 0, results: [] });
    const res = await fetch("https://google.serper.dev/jobs", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": env.SERPER_API_KEY,
        },
        body: JSON.stringify({ q, location }),
    });
    if (!res.ok)
        return JobsResponseSchema.parse({ provider: "serper", count: 0, results: [] });
    const data = await res.json();
    const raw = (data?.jobs ?? []);
    const top = typeof n === "number" ? raw.slice(0, n) : raw;
    const mapped = top.map(mapSerperResultToFirecrawl).filter(Boolean);
    return JobsResponseSchema.parse({ provider: "serper", count: mapped.length, results: mapped });
}
export async function searchSerpApi(env, q, location, n) {
    if (!env.SERPAPI_API_KEY)
        return JobsResponseSchema.parse({ provider: "serpapi", count: 0, results: [] });
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_jobs");
    url.searchParams.set("q", q);
    url.searchParams.set("api_key", env.SERPAPI_API_KEY);
    if (location)
        url.searchParams.set("location", location);
    const res = await fetch(url.toString());
    if (!res.ok)
        return JobsResponseSchema.parse({ provider: "serpapi", count: 0, results: [] });
    const data = await res.json();
    const raw = (data?.jobs_results ?? []);
    const top = typeof n === "number" ? raw.slice(0, n) : raw;
    const mapped = top.map(mapSerpApiResultToFirecrawl).filter(Boolean);
    return JobsResponseSchema.parse({ provider: "serpapi", count: mapped.length, results: mapped });
}
export async function searchJobs(env, q, location, n, provider) {
    const chosen = provider || env.DEFAULT_PROVIDER || "serper";
    return chosen === "serpapi" ? searchSerpApi(env, q, location, n) : searchSerper(env, q, location, n);
}
