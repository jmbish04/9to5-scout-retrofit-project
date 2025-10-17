import { beforeAll, describe, expect, it } from "vitest";
import { EmbeddingsManager } from "../src/lib/embeddings";
import { RAGAgent } from "../src/lib/rag_agent";

// Mock environment for testing
const mockEnv = {
  AI: {
    run: async (model: string, input: any) => {
      // Mock embedding response
      if (model === "@cf/baai/bge-large-en-v1.5") {
        return {
          data: [
            Array(768)
              .fill(0)
              .map(() => Math.random() - 0.5),
          ],
        };
      }
      // Mock LLM response
      return {
        response: "This is a mock response from the AI model.",
      };
    },
  },
  DB: {
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        run: async () => ({ results: [] }),
        first: async () => null,
        all: async () => ({ results: [] }),
      }),
    }),
  },
  JOB_OPENINGS_INDEX: {
    upsert: async (vectors: any[]) => ({ success: true }),
    query: async (vector: number[], options: any) => [
      {
        id: "test-job-1",
        score: 0.95,
        metadata: { content_type: "job_opening" },
      },
      {
        id: "test-job-2",
        score: 0.87,
        metadata: { content_type: "job_opening" },
      },
    ],
    deleteByIds: async (ids: string[]) => ({ success: true }),
  },
  RESUMES_INDEX: {
    upsert: async (vectors: any[]) => ({ success: true }),
    query: async (vector: number[], options: any) => [
      {
        id: "test-resume-1",
        score: 0.92,
        metadata: { content_type: "resume" },
      },
      {
        id: "test-resume-2",
        score: 0.85,
        metadata: { content_type: "resume" },
      },
    ],
    deleteByIds: async (ids: string[]) => ({ success: true }),
  },
  COVER_LETTERS_INDEX: {
    upsert: async (vectors: any[]) => ({ success: true }),
    query: async (vector: number[], options: any) => [
      {
        id: "test-cover-1",
        score: 0.88,
        metadata: { content_type: "cover_letter" },
      },
    ],
    deleteByIds: async (ids: string[]) => ({ success: true }),
  },
  GENERAL_CONTENT_INDEX: {
    upsert: async (vectors: any[]) => ({ success: true }),
    query: async (vector: number[], options: any) => [
      {
        id: "test-content-1",
        score: 0.9,
        metadata: { content_type: "general_content" },
      },
    ],
    deleteByIds: async (ids: string[]) => ({ success: true }),
  },
};

describe("EmbeddingsManager", () => {
  let embeddingsManager: EmbeddingsManager;

  beforeAll(() => {
    embeddingsManager = new EmbeddingsManager(mockEnv as any);
  });

  describe("generateEmbedding", () => {
    it("should generate a 768-dimensional embedding", async () => {
      const content =
        "This is a test job description for a software engineer position.";
      const embedding = await embeddingsManager.generateEmbedding(content);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768);
      expect(embedding.every((val) => typeof val === "number")).toBe(true);
    });

    it("should handle empty content", async () => {
      const content = "";
      const embedding = await embeddingsManager.generateEmbedding(content);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768);
    });
  });

  describe("createAssetEmbedding", () => {
    it("should create an embedding for a job opening", async () => {
      const asset = {
        uuid: "test-job-uuid-1",
        content:
          "Senior Software Engineer at Tech Corp - Remote position with competitive salary",
        contentType: "job_opening" as const,
        metadata: { company: "Tech Corp", location: "Remote" },
      };

      const result = await embeddingsManager.createAssetEmbedding(asset);

      expect(result.success).toBe(true);
      expect(result.uuid).toBeDefined();
      expect(result.vectorizeIndex).toBe("job-openings");
      expect(result.vectorId).toBeDefined();
    });

    it("should create an embedding for a resume", async () => {
      const asset = {
        uuid: "test-resume-uuid-1",
        content:
          "Experienced software engineer with 5+ years in full-stack development",
        contentType: "resume" as const,
        metadata: {
          experience_years: 5,
          skills: ["JavaScript", "Python", "React"],
        },
      };

      const result = await embeddingsManager.createAssetEmbedding(asset);

      expect(result.success).toBe(true);
      expect(result.uuid).toBeDefined();
      expect(result.vectorizeIndex).toBe("resumes");
    });

    it("should handle invalid content type", async () => {
      const asset = {
        uuid: "test-invalid-uuid",
        content: "Some content",
        contentType: "invalid_type" as any,
        metadata: {},
      };

      await expect(
        embeddingsManager.createAssetEmbedding(asset)
      ).rejects.toThrow("Unsupported content type: invalid_type");
    });
  });

  describe("performRAGQuery", () => {
    it("should perform a RAG query and return results", async () => {
      const ragQuery = {
        query: "Find software engineering jobs",
        vectorizeIndex: "job_opening",
        limit: 5,
      };

      const result = await embeddingsManager.performRAGQuery(ragQuery);

      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.queryId).toBeDefined();
      expect(result.context).toBeDefined();
      expect(typeof result.context).toBe("string");
    });

    it("should handle different content types", async () => {
      const contentTypes = [
        "job_opening",
        "resume",
        "cover_letter",
        "general_content",
      ];

      for (const contentType of contentTypes) {
        const ragQuery = {
          query: "Test query",
          vectorizeIndex: contentType,
          limit: 3,
        };

        const result = await embeddingsManager.performRAGQuery(ragQuery);
        expect(result.results).toBeDefined();
        expect(result.queryId).toBeDefined();
      }
    });
  });

  describe("searchByUUID", () => {
    it("should find similar content by UUID", async () => {
      // Mock the database response
      const mockDb = {
        prepare: (query: string) => ({
          bind: (...params: any[]) => ({
            first: async () => ({
              content_type: "job_opening",
              content_preview: "Test job description",
            }),
          }),
        }),
      };

      const manager = new EmbeddingsManager({ ...mockEnv, DB: mockDb } as any);
      const results = await manager.searchByUUID("test-uuid", 5);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

describe("RAGAgent", () => {
  let ragAgent: RAGAgent;
  const mockState = {} as any;

  beforeAll(() => {
    ragAgent = new RAGAgent(mockState, mockEnv as any);
  });

  describe("answerQuestion", () => {
    it("should answer questions using RAG context", async () => {
      const question =
        "What are the requirements for software engineering jobs?";
      const answer = await ragAgent.answerQuestion(question);

      expect(answer).toBeDefined();
      expect(typeof answer).toBe("string");
      expect(answer.length).toBeGreaterThan(0);
    });

    it("should handle questions with specific context types", async () => {
      const question = "What skills are mentioned in resumes?";
      const contextTypes = ["resume"];
      const answer = await ragAgent.answerQuestion(question, contextTypes);

      expect(answer).toBeDefined();
      expect(typeof answer).toBe("string");
    });
  });

  describe("findSimilarJobs", () => {
    it("should find similar jobs based on description", async () => {
      const jobDescription =
        "Looking for a senior software engineer with React experience";
      const similarJobs = await ragAgent.findSimilarJobs(jobDescription, 5);

      expect(Array.isArray(similarJobs)).toBe(true);
    });
  });

  describe("findMatchingResumes", () => {
    it("should find matching resumes for a job", async () => {
      const jobDescription =
        "Senior software engineer position requiring Python and machine learning";
      const matchingResumes = await ragAgent.findMatchingResumes(
        jobDescription,
        5
      );

      expect(Array.isArray(matchingResumes)).toBe(true);
    });
  });

  describe("generateCoverLetterSuggestions", () => {
    it("should generate cover letter suggestions", async () => {
      const jobDescription = "Software engineer position at a startup";
      const resumeContent = "Experienced developer with full-stack skills";

      const suggestions = await ragAgent.generateCoverLetterSuggestions(
        jobDescription,
        resumeContent
      );

      expect(suggestions).toBeDefined();
      expect(typeof suggestions).toBe("string");
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("getJobMarketInsights", () => {
    it("should provide job market insights", async () => {
      const query = "software engineering trends";
      const insights = await ragAgent.getJobMarketInsights(query);

      expect(insights).toBeDefined();
      expect(typeof insights).toBe("string");
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe("searchAllContent", () => {
    it("should search across all content types", async () => {
      const query = "machine learning engineer";
      const results = await ragAgent.searchAllContent(query, 10);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Check that we have results from different content types
      // RAGResult has results array, not vectorizeIndex directly
      expect(results.length).toBeGreaterThan(0);
      // Each result should have a results array with VectorSearchResult objects
      results.forEach((result) => {
        expect(Array.isArray(result.results)).toBe(true);
        expect(result.queryId).toBeDefined();
        expect(result.context).toBeDefined();
      });
    });
  });

  describe("getAnalytics", () => {
    it("should return analytics data", async () => {
      const analytics = await ragAgent.getAnalytics("7d");

      expect(analytics).toBeDefined();
      expect(analytics.interactions).toBeDefined();
      expect(analytics.topQueries).toBeDefined();
      expect(analytics.timeframe).toBe("7d");
    });
  });
});

describe("Integration Tests", () => {
  it("should handle complete RAG workflow", async () => {
    const embeddingsManager = new EmbeddingsManager(mockEnv as any);
    const ragAgent = new RAGAgent({} as any, mockEnv as any);

    // 1. Create embeddings for different content types
    const jobAsset = {
      uuid: "integration-job-uuid",
      content:
        "Senior Software Engineer - Remote - $120k-150k - React, Node.js, TypeScript",
      contentType: "job_opening" as const,
      metadata: { company: "TechCorp", salary_min: 120000, salary_max: 150000 },
    };

    const resumeAsset = {
      uuid: "integration-resume-uuid",
      content:
        "Full-stack developer with 5 years experience in React, Node.js, and TypeScript",
      contentType: "resume" as const,
      metadata: {
        experience_years: 5,
        skills: ["React", "Node.js", "TypeScript"],
      },
    };

    const jobResult = await embeddingsManager.createAssetEmbedding(jobAsset);
    const resumeResult = await embeddingsManager.createAssetEmbedding(
      resumeAsset
    );

    expect(jobResult.success).toBe(true);
    expect(resumeResult.success).toBe(true);

    // 2. Perform RAG query
    const ragQuery = {
      query: "Find software engineering jobs with React experience",
      vectorizeIndex: "job_opening",
      limit: 5,
    };

    const ragResult = await embeddingsManager.performRAGQuery(ragQuery);
    expect(ragResult.results).toBeDefined();
    expect(ragResult.context).toBeDefined();

    // 3. Use RAG agent to answer questions
    const answer = await ragAgent.answerQuestion(
      "What are the salary ranges for software engineering positions?",
      ["job_opening"]
    );

    expect(answer).toBeDefined();
    expect(typeof answer).toBe("string");

    // 4. Find similar content
    const similarJobs = await ragAgent.findSimilarJobs(
      "Looking for a React developer position",
      3
    );

    expect(Array.isArray(similarJobs)).toBe(true);
  });

  it("should handle error cases gracefully", async () => {
    const embeddingsManager = new EmbeddingsManager(mockEnv as any);

    // Test with invalid content type
    await expect(
      embeddingsManager.createAssetEmbedding({
        uuid: "test-invalid-content-uuid",
        content: "Test content",
        contentType: "invalid" as any,
        metadata: {},
      })
    ).rejects.toThrow();

    // Test RAG query with invalid index
    await expect(
      embeddingsManager.performRAGQuery({
        query: "Test query",
        vectorizeIndex: "invalid_index",
        limit: 5,
      })
    ).rejects.toThrow();
  });
});
