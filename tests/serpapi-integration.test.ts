import { describe, expect, it, vi } from "vitest";
import { mapSerpApiResultToFirecrawl, searchSerpApi } from "../src/lib/talent";

// Mock environment
const mockEnv = {
  SERPAPI_API_KEY: "test-api-key",
  USAGE_TRACKER: {} as any,
  DB: {} as any,
};

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SerpAPI Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle successful SerpAPI response", async () => {
    const mockResponse = {
      jobs_results: [
        {
          title: "Software Engineer",
          company_name: "Test Company",
          location: "San Francisco, CA",
          description: "Great job opportunity",
          salary: "$100,000 - $150,000",
          date: "2024-01-15",
          job_google_link: "https://example.com/job1",
          detected_extensions: {
            salary: "$100,000 - $150,000",
            schedule_type: "Full-time",
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await searchSerpApi(
      mockEnv,
      "software engineer",
      "San Francisco",
      10
    );

    expect(result.provider).toBe("serpapi");
    expect(result.count).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].job_title).toBe("Software Engineer");
    expect(result.results[0].company_name).toBe("Test Company");
    expect(result.results[0].salary_min).toBe(100000);
    expect(result.results[0].salary_max).toBe(150000);
  });

  it("should handle SerpAPI error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const result = await searchSerpApi(mockEnv, "software engineer");

    expect(result.provider).toBe("serpapi");
    expect(result.count).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(result.error).toContain("SerpAPI request failed: 401");
  });

  it("should handle missing API key", async () => {
    const envWithoutKey = { ...mockEnv, SERPAPI_API_KEY: "" };
    const result = await searchSerpApi(envWithoutKey, "software engineer");

    expect(result.provider).toBe("serpapi");
    expect(result.count).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(result.error).toBe("SERPAPI_API_KEY not configured");
  });

  it("should map SerpAPI result correctly", () => {
    const mockSerpApiResult = {
      title: "Senior Developer",
      company_name: "Tech Corp",
      location: "Remote",
      description: "Senior developer position",
      salary: "$120,000 - $180,000",
      date: "2024-01-20",
      job_google_link: "https://example.com/senior-dev",
      detected_extensions: {
        salary: "$120,000 - $180,000",
        schedule_type: "Full-time",
      },
    };

    const result = mapSerpApiResultToFirecrawl(mockSerpApiResult);

    expect(result).not.toBeNull();
    expect(result?.job_title).toBe("Senior Developer");
    expect(result?.company_name).toBe("Tech Corp");
    expect(result?.job_location).toBe("Remote");
    expect(result?.employment_type).toBe("Full-time");
    expect(result?.salary_min).toBe(120000);
    expect(result?.salary_max).toBe(180000);
    expect(result?.url).toBe("https://example.com/senior-dev");
  });

  it("should handle SerpAPI result with extensions array", () => {
    const mockSerpApiResult = {
      title: "Frontend Developer",
      company: "Startup Inc",
      location: "New York, NY",
      description: "Frontend developer role",
      extensions: ["Full-time", "Remote work", "$90,000 - $130,000"],
      salary: "$90,000 - $130,000", // Add explicit salary field
      date: "2024-01-25",
      job_google_link: "https://example.com/frontend-dev",
    };

    const result = mapSerpApiResultToFirecrawl(mockSerpApiResult);

    expect(result).not.toBeNull();
    expect(result?.job_title).toBe("Frontend Developer");
    expect(result?.company_name).toBe("Startup Inc");
    expect(result?.employment_type).toBe("Full-time");
    expect(result?.salary_min).toBe(90000);
    expect(result?.salary_max).toBe(130000);
  });

  it("should handle network errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await searchSerpApi(mockEnv, "software engineer");

    expect(result.provider).toBe("serpapi");
    expect(result.count).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(result.error).toBe("Internal error fetching from SerpAPI");
  });
});
