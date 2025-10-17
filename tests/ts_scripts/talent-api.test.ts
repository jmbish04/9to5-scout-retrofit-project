/**
 * Comprehensive Test Suite for Google Jobs API Integration
 *
 * This test suite covers:
 * - Unit tests for GoogleJobsService class
 * - Integration tests for API endpoints
 * - Mock tests for error handling
 * - End-to-end tests for complete workflows
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GoogleJobsService,
  getJobSuggestions,
  searchJobWithTalentApi,
  searchJobsAdvanced,
  type GoogleJob,
  type SearchJobsRequest,
  type SearchJobsResponse,
  type TalentEnv,
} from "../src/lib/talent";

// Mock environment
const mockEnv: TalentEnv = {
  GCP_PROJECT_ID: "test-project-123",
  GCP_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    project_id: "test-project-123",
    private_key_id: "test-key-id",
    private_key:
      "-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
    client_email: "test@test-project-123.iam.gserviceaccount.com",
    client_id: "123456789",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project-123.iam.gserviceaccount.com",
  }),
  GCP_TENANT_ID: "test-tenant-123",
  USAGE_TRACKER: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  } as any,
  DB: {} as any,
};

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto for JWT generation
const mockCrypto = {
  subtle: {
    importKey: vi.fn(),
    sign: vi.fn(),
  },
  randomUUID: vi.fn(() => "test-uuid-123"),
};
Object.defineProperty(global, "crypto", {
  value: mockCrypto,
  writable: true,
});

describe("GoogleJobsService", () => {
  let service: GoogleJobsService;

  beforeEach(() => {
    service = new GoogleJobsService(mockEnv);
    vi.clearAllMocks();

    // Mock successful JWT operations
    mockCrypto.subtle.importKey.mockResolvedValue({});
    mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(256));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("searchJobs", () => {
    it("should successfully search jobs with valid request", async () => {
      const mockResponse: SearchJobsResponse = {
        matchingJobs: [
          {
            job: {
              name: "projects/test-project-123/jobs/job-123",
              title: "Software Engineer",
              companyDisplayName: "Google",
              description: "Join our team as a software engineer...",
              addresses: ["Mountain View, CA"],
              applicationInfo: {
                uris: ["https://careers.google.com/jobs/results/123"],
              },
              employmentTypes: ["FULL_TIME"],
              compensationInfo: {
                entries: [
                  {
                    type: "BASE",
                    unit: "YEARLY",
                    range: {
                      minCompensation: { currencyCode: "USD", units: "120000" },
                      maxCompensation: { currencyCode: "USD", units: "180000" },
                    },
                  },
                ],
              },
            },
            jobSummary: "Software Engineer at Google",
            jobTitleSnippet: "<b>Software Engineer</b>",
            searchTextSnippet: "Join our team as a <b>software engineer</b>...",
          },
        ],
        totalSize: 1,
        metadata: { requestId: "test-request-123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: SearchJobsRequest = {
        searchMode: "JOB_SEARCH",
        requestMetadata: {
          domain: "9to5-scout.com",
          sessionId: "test-session-123",
          userId: "test-user-123",
        },
        jobQuery: {
          query: "software engineer",
          companyDisplayNames: ["Google"],
        },
        pageSize: 10,
        jobView: "JOB_VIEW_FULL",
      };

      const result = await service.searchJobs(request);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://jobs.googleapis.com/v3p1beta1/projects/test-project-123/jobs:search",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: expect.stringMatching(/^Bearer /),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        })
      );
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad Request"),
      });

      const request: SearchJobsRequest = {
        searchMode: "JOB_SEARCH",
        requestMetadata: {
          domain: "9to5-scout.com",
          sessionId: "test-session-123",
          userId: "test-user-123",
        },
      };

      const result = await service.searchJobs(request);

      expect(result).toBeNull();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const request: SearchJobsRequest = {
        searchMode: "JOB_SEARCH",
        requestMetadata: {
          domain: "9to5-scout.com",
          sessionId: "test-session-123",
          userId: "test-user-123",
        },
      };

      const result = await service.searchJobs(request);

      expect(result).toBeNull();
    });
  });

  describe("searchJobsForAlert", () => {
    it("should successfully search jobs for alert", async () => {
      const mockResponse: SearchJobsResponse = {
        matchingJobs: [
          {
            job: {
              name: "projects/test-project-123/jobs/job-456",
              title: "Data Scientist",
              companyDisplayName: "Microsoft",
              description: "Looking for a data scientist...",
            },
          },
        ],
        totalSize: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: SearchJobsRequest = {
        searchMode: "JOB_SEARCH",
        requestMetadata: {
          domain: "9to5-scout.com",
          sessionId: "test-session-456",
          userId: "test-user-456",
        },
        jobQuery: {
          query: "data scientist",
        },
      };

      const result = await service.searchJobsForAlert(request);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://jobs.googleapis.com/v3p1beta1/projects/test-project-123/jobs:searchForAlert",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  describe("completeQuery", () => {
    it("should successfully complete query", async () => {
      const mockResponse = {
        completionResults: [
          { suggestion: "Software Engineer", type: "JOB_TITLE" },
          { suggestion: "Senior Software Engineer", type: "JOB_TITLE" },
          { suggestion: "Google", type: "COMPANY_NAME" },
        ],
        metadata: { requestId: "test-complete-123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.completeQuery(
        "software eng",
        10,
        ["en-US"],
        "Google"
      );

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://jobs.googleapis.com/v3p1beta1/projects/test-project-123:complete"
        ),
        expect.objectContaining({
          method: "GET",
        })
      );
    });
  });

  describe("convertGoogleJobToJob", () => {
    it("should convert Google Job to internal Job format", () => {
      const googleJob: GoogleJob = {
        name: "projects/test-project-123/jobs/job-789",
        title: "Product Manager",
        companyDisplayName: "Apple",
        description: "Lead product development...",
        addresses: ["Cupertino, CA"],
        applicationInfo: {
          uris: ["https://jobs.apple.com/en-us/details/200789"],
        },
        employmentTypes: ["FULL_TIME"],
        compensationInfo: {
          entries: [
            {
              type: "BASE",
              unit: "YEARLY",
              range: {
                minCompensation: { currencyCode: "USD", units: "150000" },
                maxCompensation: { currencyCode: "USD", units: "200000" },
              },
            },
          ],
        },
        postingPublishTime: "2024-01-15T10:00:00Z",
      };

      const result = service.convertGoogleJobToJob(googleJob);

      expect(result).toEqual({
        id: "job-789",
        title: "Product Manager",
        company: "Apple",
        url: "https://jobs.apple.com/en-us/details/200789",
        location: "Cupertino, CA",
        description_md: "Lead product development...",
        employment_type: "FULL_TIME",
        salary_min: 150000,
        salary_max: 200000,
        salary_currency: "USD",
        source: "SCRAPED",
        posted_at: "2024-01-15T10:00:00Z",
        first_seen_at: expect.any(String),
        last_crawled_at: expect.any(String),
        status: "active",
      });
    });

    it("should handle missing optional fields", () => {
      const googleJob: GoogleJob = {
        name: "projects/test-project-123/jobs/job-minimal",
        title: "Intern",
        companyDisplayName: "Startup Inc",
      };

      const result = service.convertGoogleJobToJob(googleJob);

      expect(result).toEqual({
        id: "job-minimal",
        title: "Intern",
        company: "Startup Inc",
        url: "",
        location: "",
        description_md: "",
        employment_type: "FULL_TIME",
        salary_min: undefined,
        salary_max: undefined,
        salary_currency: undefined,
        source: "SCRAPED",
        posted_at: expect.any(String),
        first_seen_at: expect.any(String),
        last_crawled_at: expect.any(String),
        status: "active",
      });
    });
  });
});

describe("Legacy Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCrypto.subtle.importKey.mockResolvedValue({});
    mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(256));
  });

  describe("searchJobWithTalentApi", () => {
    it("should search for a specific job by title and company", async () => {
      const mockResponse: SearchJobsResponse = {
        matchingJobs: [
          {
            job: {
              name: "projects/test-project-123/jobs/job-legacy",
              title: "DevOps Engineer",
              companyDisplayName: "Amazon",
              description: "Manage cloud infrastructure...",
              addresses: ["Seattle, WA"],
              applicationInfo: {
                uris: ["https://amazon.jobs/en/jobs/123456"],
              },
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchJobWithTalentApi(
        mockEnv,
        "DevOps Engineer",
        "Amazon"
      );

      expect(result).toEqual({
        id: "job-legacy",
        title: "DevOps Engineer",
        company: "Amazon",
        url: "https://amazon.jobs/en/jobs/123456",
        location: "Seattle, WA",
        description_md: "Manage cloud infrastructure...",
        employment_type: "FULL_TIME",
        salary_min: undefined,
        salary_max: undefined,
        salary_currency: undefined,
        source: "SCRAPED",
        posted_at: expect.any(String),
        first_seen_at: expect.any(String),
        last_crawled_at: expect.any(String),
        status: "active",
      });
    });

    it("should return null when no jobs found", async () => {
      const mockResponse: SearchJobsResponse = {
        matchingJobs: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchJobWithTalentApi(
        mockEnv,
        "Non-existent Job",
        "Non-existent Company"
      );

      expect(result).toBeNull();
    });
  });

  describe("searchJobsAdvanced", () => {
    it("should perform advanced search with multiple filters", async () => {
      const mockResponse: SearchJobsResponse = {
        matchingJobs: [
          {
            job: {
              name: "projects/test-project-123/jobs/job-advanced-1",
              title: "Senior Software Engineer",
              companyDisplayName: "Meta",
              description: "Build the future of social media...",
              addresses: ["Menlo Park, CA"],
              applicationInfo: {
                uris: ["https://careers.meta.com/jobs/123"],
              },
              employmentTypes: ["FULL_TIME"],
            },
          },
          {
            job: {
              name: "projects/test-project-123/jobs/job-advanced-2",
              title: "Staff Software Engineer",
              companyDisplayName: "Meta",
              description: "Lead technical initiatives...",
              addresses: ["Menlo Park, CA"],
              applicationInfo: {
                uris: ["https://careers.meta.com/jobs/456"],
              },
              employmentTypes: ["FULL_TIME"],
            },
          },
        ],
        nextPageToken: "next-page-token-123",
        totalSize: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchJobsAdvanced(mockEnv, {
        query: "software engineer",
        companyNames: ["Meta"],
        locationFilters: [
          {
            address: "Menlo Park, CA",
            distanceInMiles: 25,
          },
        ],
        jobCategories: ["COMPUTER_AND_IT"],
        employmentTypes: ["FULL_TIME"],
        pageSize: 10,
        orderBy: "relevance desc",
      });

      expect(result.jobs).toHaveLength(2);
      expect(result.nextPageToken).toBe("next-page-token-123");
      expect(result.totalSize).toBe(2);
      expect(result.jobs[0].title).toBe("Senior Software Engineer");
      expect(result.jobs[1].title).toBe("Staff Software Engineer");
    });

    it("should handle empty results", async () => {
      const mockResponse: SearchJobsResponse = {
        matchingJobs: [],
        totalSize: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchJobsAdvanced(mockEnv, {
        query: "non-existent job",
      });

      expect(result.jobs).toEqual([]);
      expect(result.totalSize).toBe(0);
    });
  });

  describe("getJobSuggestions", () => {
    it("should get job title suggestions", async () => {
      const mockResponse = {
        completionResults: [
          { suggestion: "Software Engineer", type: "JOB_TITLE" },
          { suggestion: "Senior Software Engineer", type: "JOB_TITLE" },
          { suggestion: "Principal Software Engineer", type: "JOB_TITLE" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getJobSuggestions(mockEnv, "software eng", {
        pageSize: 10,
        languageCodes: ["en-US"],
        type: "JOB_TITLE",
      });

      expect(result.suggestions).toEqual([
        "Software Engineer",
        "Senior Software Engineer",
        "Principal Software Engineer",
      ]);
    });

    it("should get company name suggestions", async () => {
      const mockResponse = {
        completionResults: [
          { suggestion: "Google", type: "COMPANY_NAME" },
          { suggestion: "Microsoft", type: "COMPANY_NAME" },
          { suggestion: "Apple", type: "COMPANY_NAME" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getJobSuggestions(mockEnv, "goo", {
        type: "COMPANY_NAME",
      });

      expect(result.suggestions).toEqual(["Google", "Microsoft", "Apple"]);
    });

    it("should handle empty suggestions", async () => {
      const mockResponse = {
        completionResults: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getJobSuggestions(mockEnv, "xyz");

      expect(result.suggestions).toEqual([]);
    });
  });
});

describe("Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCrypto.subtle.importKey.mockResolvedValue({});
    mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(256));
  });

  it("should handle usage limit exceeded", async () => {
    // Mock usage tracker to return limit exceeded
    (mockEnv.USAGE_TRACKER.get as any).mockResolvedValue("10000");

    const service = new GoogleJobsService(mockEnv);
    const request: SearchJobsRequest = {
      searchMode: "JOB_SEARCH",
      requestMetadata: {
        domain: "9to5-scout.com",
        sessionId: "test-session-123",
        userId: "test-user-123",
      },
    };

    const result = await service.searchJobs(request);

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should handle JWT generation errors", async () => {
    mockCrypto.subtle.importKey.mockRejectedValue(
      new Error("Key import failed")
    );

    const service = new GoogleJobsService(mockEnv);
    const request: SearchJobsRequest = {
      searchMode: "JOB_SEARCH",
      requestMetadata: {
        domain: "9to5-scout.com",
        sessionId: "test-session-123",
        userId: "test-user-123",
      },
    };

    const result = await service.searchJobs(request);

    expect(result).toBeNull();
  });

  it("should handle invalid service account JSON", async () => {
    const invalidEnv = {
      ...mockEnv,
      GCP_SERVICE_ACCOUNT_JSON: "invalid-json",
    };

    const service = new GoogleJobsService(invalidEnv);
    const request: SearchJobsRequest = {
      searchMode: "JOB_SEARCH",
      requestMetadata: {
        domain: "9to5-scout.com",
        sessionId: "test-session-123",
        userId: "test-user-123",
      },
    };

    const result = await service.searchJobs(request);

    expect(result).toBeNull();
  });
});

describe("Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCrypto.subtle.importKey.mockResolvedValue({});
    mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(256));
  });

  it("should perform end-to-end job search workflow", async () => {
    // Mock successful API responses
    const searchResponse: SearchJobsResponse = {
      matchingJobs: [
        {
          job: {
            name: "projects/test-project-123/jobs/job-e2e",
            title: "Full Stack Developer",
            companyDisplayName: "Netflix",
            description: "Build streaming platform features...",
            addresses: ["Los Gatos, CA"],
            applicationInfo: {
              uris: ["https://jobs.netflix.com/jobs/123"],
            },
            employmentTypes: ["FULL_TIME"],
            compensationInfo: {
              entries: [
                {
                  type: "BASE",
                  unit: "YEARLY",
                  range: {
                    minCompensation: { currencyCode: "USD", units: "130000" },
                    maxCompensation: { currencyCode: "USD", units: "190000" },
                  },
                },
              ],
            },
          },
        },
      ],
      totalSize: 1,
    };

    const suggestionsResponse = {
      completionResults: [
        { suggestion: "Full Stack Developer", type: "JOB_TITLE" },
        { suggestion: "Frontend Developer", type: "JOB_TITLE" },
        { suggestion: "Backend Developer", type: "JOB_TITLE" },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(suggestionsResponse),
      });

    // Test suggestions first
    const suggestions = await getJobSuggestions(mockEnv, "full stack", {
      type: "JOB_TITLE",
    });

    expect(suggestions.suggestions).toContain("Full Stack Developer");

    // Test job search
    const searchResult = await searchJobsAdvanced(mockEnv, {
      query: "full stack developer",
      companyNames: ["Netflix"],
      locationFilters: [
        {
          address: "Los Gatos, CA",
          distanceInMiles: 50,
        },
      ],
      employmentTypes: ["FULL_TIME"],
    });

    expect(searchResult.jobs).toHaveLength(1);
    expect(searchResult.jobs[0].title).toBe("Full Stack Developer");
    expect(searchResult.jobs[0].company).toBe("Netflix");
    expect(searchResult.jobs[0].salary_min).toBe(130000);
    expect(searchResult.jobs[0].salary_max).toBe(190000);
    expect(searchResult.jobs[0].salary_currency).toBe("USD");
  });

  it("should handle pagination correctly", async () => {
    const firstPageResponse: SearchJobsResponse = {
      matchingJobs: [
        {
          job: {
            name: "projects/test-project-123/jobs/job-page-1",
            title: "Engineer 1",
            companyDisplayName: "Company A",
          },
        },
      ],
      nextPageToken: "page-2-token",
      totalSize: 2,
    };

    const secondPageResponse: SearchJobsResponse = {
      matchingJobs: [
        {
          job: {
            name: "projects/test-project-123/jobs/job-page-2",
            title: "Engineer 2",
            companyDisplayName: "Company B",
          },
        },
      ],
      totalSize: 2,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(firstPageResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(secondPageResponse),
      });

    // First page
    const firstPage = await searchJobsAdvanced(mockEnv, {
      query: "engineer",
      pageSize: 1,
    });

    expect(firstPage.jobs).toHaveLength(1);
    expect(firstPage.nextPageToken).toBe("page-2-token");
    expect(firstPage.totalSize).toBe(2);

    // Second page
    const secondPage = await searchJobsAdvanced(mockEnv, {
      query: "engineer",
      pageSize: 1,
      pageToken: "page-2-token",
    });

    expect(secondPage.jobs).toHaveLength(1);
    expect(secondPage.jobs[0].title).toBe("Engineer 2");
  });
});

describe("Performance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCrypto.subtle.importKey.mockResolvedValue({});
    mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(256));
  });

  it("should handle large result sets efficiently", async () => {
    const largeResponse: SearchJobsResponse = {
      matchingJobs: Array.from({ length: 100 }, (_, i) => ({
        job: {
          name: `projects/test-project-123/jobs/job-${i}`,
          title: `Engineer ${i}`,
          companyDisplayName: `Company ${i}`,
          description: `Job description ${i}`,
        },
      })),
      totalSize: 100,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(largeResponse),
    });

    const startTime = Date.now();
    const result = await searchJobsAdvanced(mockEnv, {
      query: "engineer",
      pageSize: 100,
    });
    const endTime = Date.now();

    expect(result.jobs).toHaveLength(100);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });

  it("should handle concurrent requests", async () => {
    const mockResponse: SearchJobsResponse = {
      matchingJobs: [
        {
          job: {
            name: "projects/test-project-123/jobs/job-concurrent",
            title: "Concurrent Job",
            companyDisplayName: "Concurrent Company",
          },
        },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const service = new GoogleJobsService(mockEnv);
    const request: SearchJobsRequest = {
      searchMode: "JOB_SEARCH",
      requestMetadata: {
        domain: "9to5-scout.com",
        sessionId: "test-session-123",
        userId: "test-user-123",
      },
    };

    // Make 5 concurrent requests
    const promises = Array.from({ length: 5 }, () =>
      service.searchJobs(request)
    );
    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach((result) => {
      expect(result).toEqual(mockResponse);
    });
  });
});
