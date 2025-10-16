import type { Job } from "./types";

export interface TalentEnv {
  GCP_PROJECT_ID: string;
  GCP_SERVICE_ACCOUNT_JSON: string;
  GCP_TENANT_ID?: string;
  USAGE_TRACKER: KVNamespace;
  DB: D1Database;
}

// Google Jobs API v3p1beta1 endpoints
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TALENT_SCOPE = "https://www.googleapis.com/auth/jobs";
const JOBS_API_BASE = "https://jobs.googleapis.com/v3p1beta1";

// Google Jobs API Types based on the discovery document
export interface GoogleJob {
  name?: string;
  companyName?: string;
  requisitionId?: string;
  title?: string;
  description?: string;
  addresses?: string[];
  applicationInfo?: {
    emails?: string[];
    instruction?: string;
    uris?: string[];
  };
  jobBenefits?: string[];
  compensationInfo?: {
    entries?: Array<{
      type?: string;
      unit?: string;
      amount?: {
        currencyCode?: string;
        units?: string;
        nanos?: number;
      };
      range?: {
        maxCompensation?: {
          currencyCode?: string;
          units?: string;
          nanos?: number;
        };
        minCompensation?: {
          currencyCode?: string;
          units?: string;
          nanos?: number;
        };
      };
    }>;
  };
  customAttributes?: Record<
    string,
    {
      stringValues?: string[];
      longValues?: string[];
      filterable?: boolean;
    }
  >;
  degreeTypes?: string[];
  department?: string;
  employmentTypes?: string[];
  incentives?: string;
  languageCode?: string;
  jobLevel?: string;
  promotionValue?: number;
  qualifications?: string;
  responsibilities?: string;
  postingRegion?: string;
  visibility?: string;
  jobStartTime?: string;
  jobEndTime?: string;
  postingPublishTime?: string;
  postingExpireTime?: string;
  postingCreateTime?: string;
  postingUpdateTime?: string;
  companyDisplayName?: string;
  derivedInfo?: {
    locations?: Array<{
      locationType?: string;
      postalAddress?: {
        regionCode?: string;
        languageCode?: string;
        postalCode?: string;
        sortingCode?: string;
        administrativeArea?: string;
        locality?: string;
        sublocality?: string;
        addressLines?: string[];
        recipients?: string[];
        organization?: string;
      };
      latLng?: {
        latitude?: number;
        longitude?: number;
      };
      radiusInMiles?: number;
    }>;
    jobCategories?: string[];
  };
}

export interface SearchJobsRequest {
  searchMode?: "SEARCH_MODE_UNSPECIFIED" | "JOB_SEARCH" | "FEATURED_JOB_SEARCH";
  requestMetadata: {
    domain: string;
    sessionId: string;
    userId: string;
    deviceInfo?: {
      deviceType?:
        | "DEVICE_TYPE_UNSPECIFIED"
        | "WEB"
        | "MOBILE_WEB"
        | "ANDROID"
        | "IOS"
        | "BOT"
        | "OTHER";
      id?: string;
    };
  };
  jobQuery?: {
    query?: string;
    queryLanguageCode?: string;
    companyNames?: string[];
    locationFilters?: Array<{
      address?: string;
      regionCode?: string;
      latLng?: {
        latitude?: number;
        longitude?: number;
      };
      distanceInMiles?: number;
      telecommutePreference?:
        | "TELECOMMUTE_PREFERENCE_UNSPECIFIED"
        | "TELECOMMUTE_EXCLUDED"
        | "TELECOMMUTE_ALLOWED"
        | "TELECOMMUTE_JOBS_EXCLUDED";
    }>;
    jobCategories?: string[];
    commuteFilter?: {
      commuteMethod:
        | "COMMUTE_METHOD_UNSPECIFIED"
        | "DRIVING"
        | "TRANSIT"
        | "WALKING"
        | "CYCLING";
      startCoordinates: {
        latitude: number;
        longitude: number;
      };
      travelDuration: string;
      allowImpreciseAddresses?: boolean;
      roadTraffic?: "ROAD_TRAFFIC_UNSPECIFIED" | "TRAFFIC_FREE" | "BUSY_HOUR";
      departureTime?: {
        hours: number;
        minutes: number;
        seconds: number;
        nanos: number;
      };
    };
    companyDisplayNames?: string[];
    compensationFilter?: {
      type:
        | "FILTER_TYPE_UNSPECIFIED"
        | "UNIT_ONLY"
        | "UNIT_AND_AMOUNT"
        | "ANNUALIZED_BASE_AMOUNT"
        | "ANNUALIZED_TOTAL_AMOUNT";
      units: string[];
      range?: {
        maxCompensation?: {
          currencyCode?: string;
          units?: string;
          nanos?: number;
        };
        minCompensation?: {
          currencyCode?: string;
          units?: string;
          nanos?: number;
        };
      };
      includeJobsWithUnspecifiedCompensationRange?: boolean;
    };
    customAttributeFilter?: string;
    disableSpellCheck?: boolean;
    employmentTypes?: string[];
    languageCodes?: string[];
    publishTimeRange?: {
      startTime?: string;
      endTime?: string;
    };
    excludedJobs?: string[];
  };
  enableBroadening?: boolean;
  requirePreciseResultSize?: boolean;
  histogramFacets?: {
    simpleHistogramFacets?: string[];
    customAttributeHistogramFacets?: Array<{
      key: string;
      stringValueHistogram?: boolean;
      longValueHistogramBucketingOption?: {
        bucketBounds: number[];
        requiresMinMax?: boolean;
      };
    }>;
    compensationHistogramFacets?: Array<{
      type:
        | "COMPENSATION_HISTOGRAM_REQUEST_TYPE_UNSPECIFIED"
        | "BASE"
        | "ANNUALIZED_BASE"
        | "ANNUALIZED_TOTAL";
      bucketingOption: {
        bucketBounds: number[];
        requiresMinMax?: boolean;
      };
    }>;
  };
  histogramQueries?: Array<{
    histogramQuery: string;
  }>;
  jobView?:
    | "JOB_VIEW_UNSPECIFIED"
    | "JOB_VIEW_ID_ONLY"
    | "JOB_VIEW_MINIMAL"
    | "JOB_VIEW_SMALL"
    | "JOB_VIEW_FULL";
  offset?: number;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  diversificationLevel?:
    | "DIVERSIFICATION_LEVEL_UNSPECIFIED"
    | "DISABLED"
    | "SIMPLE";
  customRankingInfo?: {
    importanceLevel:
      | "IMPORTANCE_LEVEL_UNSPECIFIED"
      | "NONE"
      | "LOW"
      | "MILD"
      | "MEDIUM"
      | "HIGH"
      | "EXTREME";
    rankingExpression: string;
  };
  disableKeywordMatch?: boolean;
}

export interface SearchJobsResponse {
  matchingJobs?: Array<{
    job?: GoogleJob;
    jobSummary?: string;
    jobTitleSnippet?: string;
    searchTextSnippet?: string;
    commuteInfo?: {
      jobLocation?: {
        locationType?: string;
        postalAddress?: any;
        latLng?: {
          latitude?: number;
          longitude?: number;
        };
        radiusInMiles?: number;
      };
      travelDuration?: string;
    };
  }>;
  histogramResults?: {
    simpleHistogramResults?: Array<{
      searchType?: string;
      values?: Record<string, number>;
    }>;
    customAttributeHistogramResults?: Array<{
      key?: string;
      stringValueHistogramResult?: Record<string, number>;
      longValueHistogramResult?: {
        counts?: Array<{
          range?: {
            from?: number;
            to?: number;
          };
          count?: number;
        }>;
        minValue?: number;
        maxValue?: number;
      };
    }>;
    compensationHistogramResults?: Array<{
      type?: string;
      result?: {
        counts?: Array<{
          range?: {
            from?: number;
            to?: number;
          };
          count?: number;
        }>;
        minValue?: number;
        maxValue?: number;
      };
    }>;
  };
  histogramQueryResults?: Array<{
    histogramQuery?: string;
    histogram?: Record<string, string>;
  }>;
  nextPageToken?: string;
  locationFilters?: Array<{
    locationType?: string;
    postalAddress?: any;
    latLng?: {
      latitude?: number;
      longitude?: number;
    };
    radiusInMiles?: number;
  }>;
  estimatedTotalSize?: number;
  totalSize?: number;
  metadata?: {
    requestId?: string;
  };
  broadenedQueryJobsCount?: number;
  spellCorrection?: {
    corrected?: boolean;
    correctedText?: string;
  };
}

function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getAccessToken(env: TalentEnv): Promise<string> {
  console.log("🔑 Starting Google OAuth token generation...");
  
  try {
    const serviceAccount = JSON.parse(env.GCP_SERVICE_ACCOUNT_JSON);
    console.log(`📧 Service account email: ${serviceAccount.client_email}`);
    console.log(`🏢 Project ID: ${serviceAccount.project_id}`);
    
    const now = Math.floor(Date.now() / 1000);
    console.log(`⏰ Token timestamp: ${now} (expires: ${now + 3600})`);

    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: serviceAccount.client_email,
      scope: TALENT_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    };

    console.log(`🎯 OAuth scope: ${TALENT_SCOPE}`);
    console.log(`🔗 Token URL: ${TOKEN_URL}`);

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    console.log("🔐 Importing private key for JWT signing...");
    const keyData = pemToArrayBuffer(serviceAccount.private_key);
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyData,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    console.log("✍️ Signing JWT token...");
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );
    const jwt = `${signingInput}.${base64url(signature)}`;

    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    });

    console.log("🌐 Requesting access token from Google OAuth...");
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Failed to obtain access token: ${res.status} ${res.statusText}`);
      console.error(`📄 Error response: ${errorText}`);
      throw new Error(`Failed to obtain access token: ${res.status} ${errorText}`);
    }

    const data = (await res.json()) as { access_token: string };
    console.log("✅ Successfully obtained Google OAuth access token");
    return data.access_token;
  } catch (error) {
    console.error("💥 Error in getAccessToken:", error);
    throw error;
  }
}

async function checkAndIncrementUsage(env: TalentEnv): Promise<boolean> {
  const now = new Date();
  const key = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
  const current = parseInt((await env.USAGE_TRACKER.get(key)) || "0", 10);
  if (current >= 10000) {
    return false;
  }
  await env.USAGE_TRACKER.put(key, String(current + 1));
  return true;
}

// Core Google Jobs API service class
export class GoogleJobsService {
  constructor(private env: TalentEnv) {}

  async searchJobs(
    request: SearchJobsRequest
  ): Promise<SearchJobsResponse | null> {
    console.log("🔍 Starting Google Jobs API search...");
    console.log(`📝 Search query: ${request.jobQuery?.query || 'N/A'}`);
    console.log(`📍 Location filters: ${request.jobQuery?.locationFilters?.length || 0}`);
    console.log(`🏢 Company names: ${request.jobQuery?.companyNames?.length || 0}`);
    console.log(`📊 Page size: ${request.pageSize || 'default'}`);

    const allowed = await checkAndIncrementUsage(this.env);
    if (!allowed) {
      console.warn("⚠️ Google Jobs API monthly usage limit reached");
      return null;
    }
    console.log("✅ Usage limit check passed");

    try {
      const accessToken = await getAccessToken(this.env);
      const url = `${JOBS_API_BASE}/projects/${this.env.GCP_PROJECT_ID}/jobs:search`;
      
      console.log(`🌐 Making request to: ${url}`);
      console.log(`📋 Request body: ${JSON.stringify(request, null, 2)}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Google Jobs API search failed: ${response.status} ${response.statusText}`);
        console.error(`📄 Error response: ${errorText}`);
        return null;
      }

      const result = (await response.json()) as SearchJobsResponse;
      console.log(`✅ Search successful! Found ${result.matchingJobs?.length || 0} jobs`);
      console.log(`📊 Total size: ${result.totalSize || result.estimatedTotalSize || 'unknown'}`);
      
      return result;
    } catch (error) {
      console.error("💥 Google Jobs API integration error:", error);
      return null;
    }
  }

  async searchJobsForAlert(
    request: SearchJobsRequest
  ): Promise<SearchJobsResponse | null> {
    const allowed = await checkAndIncrementUsage(this.env);
    if (!allowed) {
      console.warn("Google Jobs API monthly usage limit reached");
      return null;
    }

    try {
      const accessToken = await getAccessToken(this.env);
      const url = `${JOBS_API_BASE}/projects/${this.env.GCP_PROJECT_ID}/jobs:searchForAlert`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.error(
          "Google Jobs API searchForAlert failed",
          response.status,
          await response.text()
        );
        return null;
      }

      return (await response.json()) as SearchJobsResponse;
    } catch (error) {
      console.error("Google Jobs API searchForAlert error", error);
      return null;
    }
  }

  async completeQuery(
    query: string,
    pageSize: number = 10,
    languageCodes?: string[],
    companyName?: string,
    scope: "COMPLETION_SCOPE_UNSPECIFIED" | "TENANT" | "PUBLIC" = "PUBLIC",
    type:
      | "COMPLETION_TYPE_UNSPECIFIED"
      | "JOB_TITLE"
      | "COMPANY_NAME"
      | "COMBINED" = "COMBINED"
  ): Promise<any> {
    const allowed = await checkAndIncrementUsage(this.env);
    if (!allowed) {
      console.warn("Google Jobs API monthly usage limit reached");
      return null;
    }

    try {
      const accessToken = await getAccessToken(this.env);
      const params = new URLSearchParams({
        query,
        pageSize: pageSize.toString(),
        scope,
        type,
      });

      if (languageCodes?.length) {
        languageCodes.forEach((code) => params.append("languageCodes", code));
      }
      if (companyName) {
        params.append("companyName", companyName);
      }

      const url = `${JOBS_API_BASE}/projects/${this.env.GCP_PROJECT_ID}:complete?${params}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error(
          "Google Jobs API complete failed",
          response.status,
          await response.text()
        );
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Google Jobs API complete error", error);
      return null;
    }
  }

  // Convert Google Job to internal Job format
  convertGoogleJobToJob(googleJob: GoogleJob): Job {
    const location =
      googleJob.addresses?.[0] ||
      googleJob.derivedInfo?.locations?.[0]?.postalAddress?.addressLines?.join(
        ", "
      ) ||
      googleJob.derivedInfo?.locations?.[0]?.postalAddress?.locality;

    return {
      id: googleJob.name?.split("/").pop(),
      title: googleJob.title || "",
      company: googleJob.companyDisplayName || "",
      url: googleJob.applicationInfo?.uris?.[0] || "",
      location: location || "",
      description_md: googleJob.description || "",
      employment_type: googleJob.employmentTypes?.[0] || "FULL_TIME",
      salary_min: this.extractSalaryMin(googleJob),
      salary_max: this.extractSalaryMax(googleJob),
      salary_currency: this.extractSalaryCurrency(googleJob),
      source: "SCRAPED" as const,
      posted_at: googleJob.postingPublishTime || new Date().toISOString(),
      first_seen_at: new Date().toISOString(),
      last_crawled_at: new Date().toISOString(),
      status: "active",
    };
  }

  private extractSalaryMin(googleJob: GoogleJob): number | undefined {
    const compensation = googleJob.compensationInfo?.entries?.find(
      (entry) => entry.type === "BASE"
    );
    if (compensation?.range?.minCompensation) {
      return parseInt(compensation.range.minCompensation.units || "0");
    }
    return undefined;
  }

  private extractSalaryMax(googleJob: GoogleJob): number | undefined {
    const compensation = googleJob.compensationInfo?.entries?.find(
      (entry) => entry.type === "BASE"
    );
    if (compensation?.range?.maxCompensation) {
      return parseInt(compensation.range.maxCompensation.units || "0");
    }
    return undefined;
  }

  private extractSalaryCurrency(googleJob: GoogleJob): string | undefined {
    const compensation = googleJob.compensationInfo?.entries?.find(
      (entry) => entry.type === "BASE"
    );
    return (
      compensation?.range?.minCompensation?.currencyCode ||
      compensation?.range?.maxCompensation?.currencyCode ||
      compensation?.amount?.currencyCode
    );
  }
}

// Legacy function for backward compatibility
export async function searchJobWithTalentApi(
  env: TalentEnv,
  jobTitle: string,
  companyName: string
): Promise<Job | null> {
  const service = new GoogleJobsService(env);

  const request: SearchJobsRequest = {
    searchMode: "JOB_SEARCH",
    requestMetadata: {
      domain: "9to5-scout.com",
      sessionId: crypto.randomUUID(),
      userId: "worker",
    },
    jobQuery: {
      query: jobTitle,
      companyDisplayNames: [companyName],
    },
    pageSize: 1,
    jobView: "JOB_VIEW_FULL",
  };

  const response = await service.searchJobs(request);
  if (!response?.matchingJobs?.length) {
    return null;
  }

  const googleJob = response.matchingJobs?.[0]?.job;
  if (!googleJob) {
    return null;
  }

  return service.convertGoogleJobToJob(googleJob);
}

// Enhanced search function with more options
export async function searchJobsAdvanced(
  env: TalentEnv,
  options: {
    query?: string;
    companyNames?: string[];
    locationFilters?: Array<{
      address?: string;
      regionCode?: string;
      latLng?: { latitude: number; longitude: number };
      distanceInMiles?: number;
      telecommutePreference?:
        | "TELECOMMUTE_PREFERENCE_UNSPECIFIED"
        | "TELECOMMUTE_EXCLUDED"
        | "TELECOMMUTE_ALLOWED"
        | "TELECOMMUTE_JOBS_EXCLUDED";
    }>;
    jobCategories?: string[];
    employmentTypes?: string[];
    compensationFilter?: {
      type:
        | "FILTER_TYPE_UNSPECIFIED"
        | "UNIT_ONLY"
        | "UNIT_AND_AMOUNT"
        | "ANNUALIZED_BASE_AMOUNT"
        | "ANNUALIZED_TOTAL_AMOUNT";
      units: string[];
      range?: {
        maxCompensation?: {
          currencyCode?: string;
          units?: string;
          nanos?: number;
        };
        minCompensation?: {
          currencyCode?: string;
          units?: string;
          nanos?: number;
        };
      };
    };
    pageSize?: number;
    pageToken?: string;
    orderBy?: string;
  }
): Promise<{ jobs: Job[]; nextPageToken?: string; totalSize?: number }> {
  const service = new GoogleJobsService(env);

  const request: SearchJobsRequest = {
    searchMode: "JOB_SEARCH",
    requestMetadata: {
      domain: "9to5-scout.com",
      sessionId: crypto.randomUUID(),
      userId: "worker",
    },
    jobQuery: {
      query: options.query,
      companyNames: options.companyNames,
      locationFilters: options.locationFilters,
      jobCategories: options.jobCategories,
      employmentTypes: options.employmentTypes,
      compensationFilter: options.compensationFilter,
    },
    pageSize: options.pageSize || 10,
    pageToken: options.pageToken,
    orderBy: options.orderBy || "relevance desc",
    jobView: "JOB_VIEW_FULL",
  };

  const response = await service.searchJobs(request);
  if (!response?.matchingJobs) {
    return { jobs: [] };
  }

  const jobs =
    response.matchingJobs
      ?.map((matchingJob) => matchingJob.job)
      .filter((googleJob): googleJob is GoogleJob => googleJob !== undefined)
      .map((googleJob) => service.convertGoogleJobToJob(googleJob)) || [];

  return {
    jobs,
    nextPageToken: response.nextPageToken,
    totalSize: response.totalSize,
  };
}

// Auto-complete function for search suggestions
export async function getJobSuggestions(
  env: TalentEnv,
  query: string,
  options: {
    pageSize?: number;
    languageCodes?: string[];
    companyName?: string;
    scope?: "COMPLETION_SCOPE_UNSPECIFIED" | "TENANT" | "PUBLIC";
    type?:
      | "COMPLETION_TYPE_UNSPECIFIED"
      | "JOB_TITLE"
      | "COMPANY_NAME"
      | "COMBINED";
  } = {}
): Promise<{ suggestions: string[] }> {
  const service = new GoogleJobsService(env);

  const response = await service.completeQuery(
    query,
    options.pageSize || 10,
    options.languageCodes,
    options.companyName,
    options.scope || "PUBLIC",
    options.type || "COMBINED"
  );

  if (!response?.completionResults) {
    return { suggestions: [] };
  }

  const suggestions = response.completionResults
    .map((result: any) => result.suggestion)
    .filter((suggestion: string) => suggestion);

  return { suggestions };
}
