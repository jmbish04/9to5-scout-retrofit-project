// test/schemas.test.ts
import { describe, expect, it } from "vitest";
import { JobsResponseSchema, QuerySchema } from "../src/lib/schemas";

describe("zod schemas", () => {
  it("validates query", () => {
    const q = QuerySchema.parse({
      q: "bi program manager",
      n: "10",
      provider: "serper",
    });
    expect(q.n).toBe(10);
  });

  it("validates response", () => {
    const res = JobsResponseSchema.parse({
      provider: "serper",
      count: 0,
      results: [],
    });
    expect(res.count).toBe(0);
  });

  it("validates job data", () => {
    const job = {
      company_name: "Tech Corp",
      job_title: "Software Engineer",
      job_location: "Remote",
      salary_min: 80000,
      salary_max: 120000,
      salary_currency: "USD",
      url: "https://example.com/job/123",
    };

    const result = JobsResponseSchema.parse({
      provider: "serper",
      count: 1,
      results: [job],
    });

    expect(result.results[0].company_name).toBe("Tech Corp");
  });
});
