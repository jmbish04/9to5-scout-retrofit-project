/**
 * End-to-End Integration Tests for Google Jobs API
 *
 * These tests demonstrate complete workflows and real-world usage scenarios
 * for the Google Jobs API integration with the 9to5-scout system.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GoogleJobsService,
  getJobSuggestions,
  searchJobsAdvanced,
  type TalentEnv,
} from "../src/lib/talent";
import {
  createMockEnv,
  createMockGoogleJob,
  mockSuccessfulResponse,
} from "./setup";

describe("End-to-End Google Jobs API Integration", () => {
  let mockEnv: TalentEnv;
  let service: GoogleJobsService;

  beforeEach(() => {
    mockEnv = createMockEnv();
    service = new GoogleJobsService(mockEnv);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Complete Job Search Workflow", () => {
    it("should perform a complete job search from suggestion to results", async () => {
      // Mock suggestion response
      const suggestionsResponse = {
        completionResults: [
          { suggestion: "Software Engineer", type: "JOB_TITLE" },
          { suggestion: "Senior Software Engineer", type: "JOB_TITLE" },
          { suggestion: "Staff Software Engineer", type: "JOB_TITLE" },
          { suggestion: "Google", type: "COMPANY_NAME" },
          { suggestion: "Microsoft", type: "COMPANY_NAME" },
        ],
      };

      // Mock job search response
      const searchResponse = {
        matchingJobs: [
          {
            job: createMockGoogleJob({
              name: "projects/test-project-123/jobs/software-engineer-1",
              title: "Software Engineer",
              companyDisplayName: "Google",
              description:
                "Join our team as a software engineer working on cutting-edge projects...",
              addresses: ["Mountain View, CA"],
              applicationInfo: {
                uris: ["https://careers.google.com/jobs/results/123456"],
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
            }),
            jobSummary: "Software Engineer at Google",
            jobTitleSnippet: "<b>Software Engineer</b>",
            searchTextSnippet:
              "Join our team as a <b>software engineer</b> working on cutting-edge projects...",
          },
          {
            job: createMockGoogleJob({
              name: "projects/test-project-123/jobs/senior-software-engineer-2",
              title: "Senior Software Engineer",
              companyDisplayName: "Microsoft",
              description:
                "Lead development of cloud services and infrastructure...",
              addresses: ["Seattle, WA"],
              applicationInfo: {
                uris: ["https://careers.microsoft.com/jobs/789012"],
              },
              employmentTypes: ["FULL_TIME"],
              compensationInfo: {
                entries: [
                  {
                    type: "BASE",
                    unit: "YEARLY",
                    range: {
                      minCompensation: { currencyCode: "USD", units: "140000" },
                      maxCompensation: { currencyCode: "USD", units: "200000" },
                    },
                  },
                ],
              },
            }),
            jobSummary: "Senior Software Engineer at Microsoft",
            jobTitleSnippet: "<b>Senior Software Engineer</b>",
            searchTextSnippet:
              "Lead development of <b>cloud services</b> and infrastructure...",
          },
        ],
        totalSize: 2,
        nextPageToken: "next-page-token-123",
        metadata: { requestId: "e2e-test-request-123" },
      };

      // Mock API calls
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockSuccessfulResponse(suggestionsResponse))
        .mockResolvedValueOnce(mockSuccessfulResponse(searchResponse));

      // Step 1: Get job suggestions
      const suggestions = await getJobSuggestions(mockEnv, "software eng", {
        pageSize: 5,
        type: "COMBINED",
      });

      expect(suggestions.suggestions).toContain("Software Engineer");
      expect(suggestions.suggestions).toContain("Google");

      // Step 2: Perform job search with filters
      const searchResult = await searchJobsAdvanced(mockEnv, {
        query: "software engineer",
        companyNames: ["Google", "Microsoft"],
        locationFilters: [
          {
            address: "San Francisco Bay Area",
            distanceInMiles: 50,
          },
        ],
        jobCategories: ["COMPUTER_AND_IT"],
        employmentTypes: ["FULL_TIME"],
        compensationFilter: {
          type: "ANNUALIZED_BASE_AMOUNT",
          units: ["YEARLY"],
          range: {
            minCompensation: { currencyCode: "USD", units: "100000" },
            maxCompensation: { currencyCode: "USD", units: "250000" },
          },
        },
        pageSize: 10,
        orderBy: "relevance desc",
      });

      // Verify search results
      expect(searchResult.jobs).toHaveLength(2);
      expect(searchResult.totalSize).toBe(2);
      expect(searchResult.nextPageToken).toBe("next-page-token-123");

      // Verify job details
      const googleJob = searchResult.jobs[0];
      expect(googleJob.title).toBe("Software Engineer");
      expect(googleJob.company).toBe("Google");
      expect(googleJob.location).toBe("Mountain View, CA");
      expect(googleJob.salary_min).toBe(120000);
      expect(googleJob.salary_max).toBe(180000);
      expect(googleJob.salary_currency).toBe("USD");
      expect(googleJob.url).toBe(
        "https://careers.google.com/jobs/results/123456"
      );

      const microsoftJob = searchResult.jobs[1];
      expect(microsoftJob.title).toBe("Senior Software Engineer");
      expect(microsoftJob.company).toBe("Microsoft");
      expect(microsoftJob.location).toBe("Seattle, WA");
      expect(microsoftJob.salary_min).toBe(140000);
      expect(microsoftJob.salary_max).toBe(200000);
    });

    it("should handle pagination correctly in a real-world scenario", async () => {
      const firstPageResponse = {
        matchingJobs: Array.from({ length: 10 }, (_, i) => ({
          job: createMockGoogleJob({
            name: `projects/test-project-123/jobs/job-${i + 1}`,
            title: `Software Engineer ${i + 1}`,
            companyDisplayName: `Company ${i + 1}`,
            description: `Job description ${i + 1}`,
          }),
        })),
        nextPageToken: "page-2-token",
        totalSize: 25,
      };

      const secondPageResponse = {
        matchingJobs: Array.from({ length: 10 }, (_, i) => ({
          job: createMockGoogleJob({
            name: `projects/test-project-123/jobs/job-${i + 11}`,
            title: `Software Engineer ${i + 11}`,
            companyDisplayName: `Company ${i + 11}`,
            description: `Job description ${i + 11}`,
          }),
        })),
        nextPageToken: "page-3-token",
        totalSize: 25,
      };

      const thirdPageResponse = {
        matchingJobs: Array.from({ length: 5 }, (_, i) => ({
          job: createMockGoogleJob({
            name: `projects/test-project-123/jobs/job-${i + 21}`,
            title: `Software Engineer ${i + 21}`,
            companyDisplayName: `Company ${i + 21}`,
            description: `Job description ${i + 21}`,
          }),
        })),
        totalSize: 25,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockSuccessfulResponse(firstPageResponse))
        .mockResolvedValueOnce(mockSuccessfulResponse(secondPageResponse))
        .mockResolvedValueOnce(mockSuccessfulResponse(thirdPageResponse));

      // First page
      const firstPage = await searchJobsAdvanced(mockEnv, {
        query: "software engineer",
        pageSize: 10,
      });

      expect(firstPage.jobs).toHaveLength(10);
      expect(firstPage.nextPageToken).toBe("page-2-token");
      expect(firstPage.totalSize).toBe(25);

      // Second page
      const secondPage = await searchJobsAdvanced(mockEnv, {
        query: "software engineer",
        pageSize: 10,
        pageToken: "page-2-token",
      });

      expect(secondPage.jobs).toHaveLength(10);
      expect(secondPage.nextPageToken).toBe("page-3-token");

      // Third page
      const thirdPage = await searchJobsAdvanced(mockEnv, {
        query: "software engineer",
        pageSize: 10,
        pageToken: "page-3-token",
      });

      expect(thirdPage.jobs).toHaveLength(5);
      expect(thirdPage.nextPageToken).toBeUndefined();
    });
  });

  describe("Advanced Search Scenarios", () => {
    it("should handle complex location filtering", async () => {
      const searchResponse = {
        matchingJobs: [
          {
            job: createMockGoogleJob({
              title: "Remote Software Engineer",
              companyDisplayName: "Remote Company",
              addresses: ["Remote"],
              derivedInfo: {
                locations: [
                  {
                    locationType: "TELECOMMUTE",
                    postalAddress: {
                      regionCode: "US",
                    },
                  },
                ],
              },
            }),
          },
        ],
        totalSize: 1,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockSuccessfulResponse(searchResponse));

      const result = await searchJobsAdvanced(mockEnv, {
        query: "software engineer",
        locationFilters: [
          {
            address: "San Francisco, CA",
            distanceInMiles: 25,
            telecommutePreference: "TELECOMMUTE_ALLOWED",
          },
        ],
      });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe("Remote Software Engineer");
    });

    it("should handle compensation filtering", async () => {
      const searchResponse = {
        matchingJobs: [
          {
            job: createMockGoogleJob({
              title: "High-Paid Engineer",
              companyDisplayName: "Big Tech Corp",
              compensationInfo: {
                entries: [
                  {
                    type: "BASE",
                    unit: "YEARLY",
                    range: {
                      minCompensation: { currencyCode: "USD", units: "200000" },
                      maxCompensation: { currencyCode: "USD", units: "300000" },
                    },
                  },
                ],
              },
            }),
          },
        ],
        totalSize: 1,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockSuccessfulResponse(searchResponse));

      const result = await searchJobsAdvanced(mockEnv, {
        query: "engineer",
        compensationFilter: {
          type: "ANNUALIZED_BASE_AMOUNT",
          units: ["YEARLY"],
          range: {
            minCompensation: { currencyCode: "USD", units: "150000" },
            maxCompensation: { currencyCode: "USD", units: "400000" },
          },
        },
      });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].salary_min).toBe(200000);
      expect(result.jobs[0].salary_max).toBe(300000);
    });

    it("should handle job category filtering", async () => {
      const searchResponse = {
        matchingJobs: [
          {
            job: createMockGoogleJob({
              title: "Data Scientist",
              companyDisplayName: "AI Company",
              derivedInfo: {
                jobCategories: ["SCIENCE_AND_ENGINEERING"],
              },
            }),
          },
        ],
        totalSize: 1,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockSuccessfulResponse(searchResponse));

      const result = await searchJobsAdvanced(mockEnv, {
        query: "data scientist",
        jobCategories: ["SCIENCE_AND_ENGINEERING", "COMPUTER_AND_IT"],
      });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe("Data Scientist");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle API rate limiting gracefully", async () => {
      // Mock usage tracker to return limit exceeded
      (mockEnv.USAGE_TRACKER.get as any).mockResolvedValue("10000");

      const result = await searchJobsAdvanced(mockEnv, {
        query: "software engineer",
      });

      expect(result.jobs).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle network timeouts", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

      const result = await searchJobsAdvanced(mockEnv, {
        query: "software engineer",
      });

      expect(result.jobs).toEqual([]);
    });

    it("should handle malformed API responses", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: "response" }),
      });

      const result = await searchJobsAdvanced(mockEnv, {
        query: "software engineer",
      });

      expect(result.jobs).toEqual([]);
    });

    it("should handle empty search results", async () => {
      const emptyResponse = {
        matchingJobs: [],
        totalSize: 0,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockSuccessfulResponse(emptyResponse));

      const result = await searchJobsAdvanced(mockEnv, {
        query: "non-existent job title",
      });

      expect(result.jobs).toEqual([]);
      expect(result.totalSize).toBe(0);
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle large result sets efficiently", async () => {
      const largeResponse = {
        matchingJobs: Array.from({ length: 100 }, (_, i) => ({
          job: createMockGoogleJob({
            name: `projects/test-project-123/jobs/job-${i}`,
            title: `Job ${i}`,
            companyDisplayName: `Company ${i}`,
            description: `Description ${i}`,
          }),
        })),
        totalSize: 100,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockSuccessfulResponse(largeResponse));

      const startTime = Date.now();
      const result = await searchJobsAdvanced(mockEnv, {
        query: "engineer",
        pageSize: 100,
      });
      const endTime = Date.now();

      expect(result.jobs).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it("should handle concurrent requests without issues", async () => {
      const mockResponse = {
        matchingJobs: [
          {
            job: createMockGoogleJob({
              title: "Concurrent Job",
              companyDisplayName: "Concurrent Company",
            }),
          },
        ],
        totalSize: 1,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValue(mockSuccessfulResponse(mockResponse));

      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        searchJobsAdvanced(mockEnv, {
          query: `job ${i}`,
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.jobs).toHaveLength(1);
        expect(result.jobs[0].title).toBe("Concurrent Job");
      });
    });
  });

  describe("Real-World Usage Patterns", () => {
    it("should simulate a job seeker workflow", async () => {
      // Step 1: Get suggestions for job search
      const suggestionsResponse = {
        completionResults: [
          { suggestion: "Frontend Developer", type: "JOB_TITLE" },
          { suggestion: "React Developer", type: "JOB_TITLE" },
          { suggestion: "Vue Developer", type: "JOB_TITLE" },
        ],
      };

      // Step 2: Search for jobs with specific criteria
      const searchResponse = {
        matchingJobs: [
          {
            job: createMockGoogleJob({
              title: "Senior Frontend Developer",
              companyDisplayName: "Tech Startup",
              description:
                "Build amazing user interfaces with React and TypeScript...",
              addresses: ["San Francisco, CA"],
              applicationInfo: {
                uris: ["https://startup.com/careers/frontend-dev"],
              },
              employmentTypes: ["FULL_TIME"],
              compensationInfo: {
                entries: [
                  {
                    type: "BASE",
                    unit: "YEARLY",
                    range: {
                      minCompensation: { currencyCode: "USD", units: "120000" },
                      maxCompensation: { currencyCode: "USD", units: "160000" },
                    },
                  },
                ],
              },
            }),
          },
        ],
        totalSize: 1,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockSuccessfulResponse(suggestionsResponse))
        .mockResolvedValueOnce(mockSuccessfulResponse(searchResponse));

      // Simulate user typing and getting suggestions
      const suggestions = await getJobSuggestions(mockEnv, "frontend dev", {
        type: "JOB_TITLE",
        pageSize: 5,
      });

      expect(suggestions.suggestions).toContain("Frontend Developer");

      // Simulate user searching with specific criteria
      const searchResult = await searchJobsAdvanced(mockEnv, {
        query: "frontend developer",
        locationFilters: [
          {
            address: "San Francisco, CA",
            distanceInMiles: 25,
          },
        ],
        employmentTypes: ["FULL_TIME"],
        compensationFilter: {
          type: "ANNUALIZED_BASE_AMOUNT",
          units: ["YEARLY"],
          range: {
            minCompensation: { currencyCode: "USD", units: "100000" },
            maxCompensation: { currencyCode: "USD", units: "200000" },
          },
        },
        pageSize: 10,
        orderBy: "relevance desc",
      });

      // Verify the search results meet the criteria
      expect(searchResult.jobs).toHaveLength(1);
      const job = searchResult.jobs[0];
      expect(job.title).toContain("Frontend");
      expect(job.location).toBe("San Francisco, CA");
      expect(job.salary_min).toBeGreaterThanOrEqual(100000);
      expect(job.salary_max).toBeLessThanOrEqual(200000);
      expect(job.employment_type).toBe("FULL_TIME");
    });

    it("should simulate a recruiter workflow", async () => {
      // Recruiter searching for candidates for multiple positions
      const searchResponse = {
        matchingJobs: [
          {
            job: createMockGoogleJob({
              title: "Software Engineer",
              companyDisplayName: "Company A",
              description: "Looking for a software engineer...",
            }),
          },
          {
            job: createMockGoogleJob({
              title: "Senior Software Engineer",
              companyDisplayName: "Company B",
              description: "Looking for a senior software engineer...",
            }),
          },
          {
            job: createMockGoogleJob({
              title: "Staff Software Engineer",
              companyDisplayName: "Company C",
              description: "Looking for a staff software engineer...",
            }),
          },
        ],
        totalSize: 3,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockSuccessfulResponse(searchResponse));

      // Recruiter searches for all software engineering positions
      const result = await searchJobsAdvanced(mockEnv, {
        query: "software engineer",
        jobCategories: ["COMPUTER_AND_IT"],
        employmentTypes: ["FULL_TIME"],
        pageSize: 50,
        orderBy: "posting_publish_time desc",
      });

      expect(result.jobs).toHaveLength(3);
      expect(
        result.jobs.every((job) => job.title.includes("Software Engineer"))
      ).toBe(true);
    });
  });
});
