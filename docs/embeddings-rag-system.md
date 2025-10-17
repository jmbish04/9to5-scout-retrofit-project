# Embeddings and RAG System Documentation

This document describes the comprehensive embeddings and Retrieval Augmented Generation (RAG) system implemented for the 9to5-scout project.

## Overview

The system provides:

- Vector embeddings for different content types (job openings, resumes, cover letters, general content)
- UUID-based asset tracking
- RAG-powered question answering and content search
- Cloudflare Agents SDK integration for intelligent interactions
- Metadata filtering and analytics

## Architecture

### Components

1. **Vectorize Indexes**: Four separate indexes for different content types
2. **EmbeddingsManager**: Core service for generating and managing embeddings
3. **RAGAgent**: Cloudflare Agent for RAG-powered interactions
4. **D1 Database**: Stores metadata, UUIDs, and operation logs
5. **API Routes**: RESTful endpoints for all operations

### Vectorize Indexes

| Index Name        | Content Type   | Dimensions | Metric | Metadata Indexes             |
| ----------------- | -------------- | ---------- | ------ | ---------------------------- |
| `job-openings`    | Job postings   | 768        | cosine | content_type, uuid, company  |
| `resumes`         | Resume content | 768        | cosine | content_type, uuid, user_id  |
| `cover-letters`   | Cover letters  | 768        | cosine | content_type, uuid, user_id  |
| `general-content` | Other content  | 768        | cosine | content_type, uuid, category |

## API Endpoints

### Embeddings API

#### Create Embedding

```http
POST /api/embeddings
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "content": "Senior Software Engineer at TechCorp...",
  "contentType": "job_opening",
  "metadata": {
    "company": "TechCorp",
    "location": "Remote",
    "salary_min": 120000
  },
  "uuid": "optional-uuid"
}
```

#### Update Embedding

```http
PUT /api/embeddings/{uuid}
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "content": "Updated job description...",
  "contentType": "job_opening",
  "metadata": {
    "company": "TechCorp",
    "location": "Hybrid"
  }
}
```

#### Delete Embedding

```http
DELETE /api/embeddings/{uuid}?contentType=job_opening
Authorization: Bearer <API_KEY>
```

#### Search Embeddings

```http
GET /api/embeddings/search?query=software engineer&contentType=job_opening&limit=10
Authorization: Bearer <API_KEY>
```

#### Find Similar Content

```http
GET /api/embeddings/similar/{uuid}?limit=5
Authorization: Bearer <API_KEY>
```

#### Get Statistics

```http
GET /api/embeddings/stats?contentType=job_opening
Authorization: Bearer <API_KEY>
```

#### Get Operations

```http
GET /api/embeddings/operations?status=completed&limit=20
Authorization: Bearer <API_KEY>
```

### RAG API

#### Ask Questions

```http
POST /api/rag/query
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "question": "What are the salary ranges for software engineering jobs?",
  "contextTypes": ["job_opening", "resume"],
  "userId": "user123",
  "sessionId": "session456"
}
```

#### Find Similar Jobs

```http
POST /api/rag/similar-jobs
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "jobDescription": "Looking for a senior React developer...",
  "limit": 10
}
```

#### Find Matching Resumes

```http
POST /api/rag/matching-resumes
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "jobDescription": "Senior software engineer with Python experience...",
  "limit": 10
}
```

#### Generate Cover Letter Suggestions

```http
POST /api/rag/cover-letter-suggestions
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "jobDescription": "Software engineer position at a startup...",
  "resumeContent": "Experienced developer with full-stack skills..."
}
```

#### Get Job Market Insights

```http
GET /api/rag/job-market-insights?query=software engineering trends
Authorization: Bearer <API_KEY>
```

#### Search All Content

```http
GET /api/rag/search-all?query=machine learning&limit=20
Authorization: Bearer <API_KEY>
```

#### Get Analytics

```http
GET /api/rag/analytics?timeframe=7d
Authorization: Bearer <API_KEY>
```

#### Get Query History

```http
GET /api/rag/queries?userId=user123&limit=50
Authorization: Bearer <API_KEY>
```

## Usage Examples

### 1. Creating Job Opening Embeddings

```typescript
import { EmbeddingsManager } from "./lib/embeddings";

const embeddingsManager = new EmbeddingsManager(env);

const jobAsset = {
  content: `
    Senior Software Engineer
    Company: TechCorp
    Location: Remote
    Salary: $120k-150k
    
    We're looking for a senior software engineer with 5+ years of experience
    in React, Node.js, and TypeScript. You'll be working on our core platform
    and leading a team of junior developers.
  `,
  contentType: "job_opening",
  metadata: {
    company: "TechCorp",
    location: "Remote",
    salary_min: 120000,
    salary_max: 150000,
    experience_required: 5,
    skills: ["React", "Node.js", "TypeScript"],
  },
};

const result = await embeddingsManager.createAssetEmbedding(jobAsset);
console.log("Created embedding:", result);
```

### 2. Creating Resume Embeddings

```typescript
const resumeAsset = {
  content: `
    John Doe
    Senior Software Engineer
    
    Experience:
    - 5+ years developing web applications
    - Expert in React, Node.js, TypeScript
    - Led teams of 3-5 developers
    - Experience with AWS and Docker
    
    Skills: JavaScript, Python, React, Node.js, TypeScript, AWS, Docker
  `,
  contentType: "resume",
  metadata: {
    user_id: "user123",
    experience_years: 5,
    skills: [
      "JavaScript",
      "Python",
      "React",
      "Node.js",
      "TypeScript",
      "AWS",
      "Docker",
    ],
  },
};

const result = await embeddingsManager.createAssetEmbedding(resumeAsset);
```

### 3. RAG-Powered Question Answering

```typescript
import { RAGAgent } from "./lib/rag_agent";

const ragAgent = new RAGAgent(state, env);

// Answer questions about job market
const answer = await ragAgent.answerQuestion(
  "What are the most in-demand skills for software engineers?",
  ["job_opening", "resume"]
);

console.log("Answer:", answer);
```

### 4. Finding Similar Jobs

```typescript
const similarJobs = await ragAgent.findSimilarJobs(
  "Looking for a React developer position with good work-life balance",
  10
);

console.log("Similar jobs:", similarJobs);
```

### 5. Generating Cover Letter Suggestions

```typescript
const suggestions = await ragAgent.generateCoverLetterSuggestions(
  "Software engineer position at a fast-growing startup",
  "Experienced full-stack developer with React and Node.js expertise"
);

console.log("Cover letter suggestions:", suggestions);
```

## Database Schema

### asset_embeddings

Stores metadata about embedded assets.

| Column          | Type | Description                                 |
| --------------- | ---- | ------------------------------------------- |
| id              | TEXT | Primary key (UUID)                          |
| uuid            | TEXT | Unique identifier for the asset             |
| content_type    | TEXT | Type of content (job_opening, resume, etc.) |
| vectorize_index | TEXT | Which Vectorize index contains the vectors  |
| vector_id       | TEXT | ID in the Vectorize index                   |
| content_hash    | TEXT | SHA-256 hash for deduplication              |
| content_preview | TEXT | First 500 characters for preview            |
| metadata_json   | TEXT | Additional metadata as JSON                 |
| created_at      | TEXT | Creation timestamp                          |
| updated_at      | TEXT | Last update timestamp                       |

### embedding_operations

Tracks all embedding operations.

| Column          | Type | Description                            |
| --------------- | ---- | -------------------------------------- |
| id              | TEXT | Primary key                            |
| asset_uuid      | TEXT | UUID of the asset                      |
| operation_type  | TEXT | create, update, delete                 |
| status          | TEXT | pending, processing, completed, failed |
| error_message   | TEXT | Error details if failed                |
| vectorize_index | TEXT | Target Vectorize index                 |
| vector_id       | TEXT | Vector ID in Vectorize                 |
| created_at      | TEXT | Operation timestamp                    |
| completed_at    | TEXT | Completion timestamp                   |

### rag_queries

Stores RAG query history.

| Column               | Type | Description                 |
| -------------------- | ---- | --------------------------- |
| id                   | TEXT | Primary key                 |
| query_text           | TEXT | Original query text         |
| query_embedding_json | TEXT | Query embedding as JSON     |
| vectorize_index      | TEXT | Index that was queried      |
| results_json         | TEXT | Search results as JSON      |
| user_id              | TEXT | Optional user identifier    |
| session_id           | TEXT | Optional session identifier |
| created_at           | TEXT | Query timestamp             |

### agent_rag_interactions

Tracks agent interactions.

| Column            | Type | Description                   |
| ----------------- | ---- | ----------------------------- |
| id                | TEXT | Primary key                   |
| agent_id          | TEXT | Agent identifier              |
| query_id          | TEXT | Reference to rag_queries      |
| response_text     | TEXT | Agent response                |
| context_used_json | TEXT | Context used from RAG results |
| created_at        | TEXT | Interaction timestamp         |

## Configuration

### Environment Variables

Add these to your `.dev.vars` file:

```bash
# Required for embeddings
EMBEDDING_MODEL=@cf/baai/bge-large-en-v1.5

# Vectorize indexes are automatically configured in wrangler.toml
```

### Wrangler Configuration

The system requires these bindings in `wrangler.toml`:

```toml
# Vectorize indexes
[[vectorize]]
binding = "JOB_OPENINGS_INDEX"
index_name = "job-openings"

[[vectorize]]
binding = "RESUMES_INDEX"
index_name = "resumes"

[[vectorize]]
binding = "COVER_LETTERS_INDEX"
index_name = "cover-letters"

[[vectorize]]
binding = "GENERAL_CONTENT_INDEX"
index_name = "general-content"

# AI binding
[ai]
binding = "AI"

# Durable Object for RAG Agent
[durable_objects]
bindings = [
  { name = "RAG_AGENT", class_name = "RAGAgent" }
]

# Database migrations
[[migrations]]
tag = "v4"
new_sqlite_classes = ["RAGAgent"]
```

## Deployment

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Create Vectorize indexes**:

   ```bash
   npx wrangler vectorize create job-openings --dimensions=768 --metric=cosine
   npx wrangler vectorize create resumes --dimensions=768 --metric=cosine
   npx wrangler vectorize create cover-letters --dimensions=768 --metric=cosine
   npx wrangler vectorize create general-content --dimensions=768 --metric=cosine
   ```

3. **Create metadata indexes**:

   ```bash
   npx wrangler vectorize create-metadata-index job-openings --property-name=content_type --type=string
   npx wrangler vectorize create-metadata-index job-openings --property-name=uuid --type=string
   npx wrangler vectorize create-metadata-index job-openings --property-name=company --type=string
   # ... repeat for other indexes
   ```

4. **Run database migrations**:

   ```bash
   pnpm migrate:remote
   ```

5. **Deploy the worker**:
   ```bash
   pnpm deploy
   ```

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run only embeddings and RAG tests
pnpm test tests/embeddings-rag.test.ts

# Run with coverage
pnpm test:coverage
```

## Monitoring and Analytics

### Embedding Operations

Monitor embedding operations through the `/api/embeddings/operations` endpoint to track:

- Success/failure rates
- Processing times
- Error patterns

### RAG Analytics

Use the `/api/rag/analytics` endpoint to get insights on:

- Query frequency and patterns
- Most common questions
- Response quality metrics

### Database Queries

Monitor the database for:

- Asset embedding counts by type
- Query performance
- Storage usage

## Best Practices

1. **Content Chunking**: For large documents, consider chunking content into smaller pieces for better embedding quality.

2. **Metadata Usage**: Use rich metadata to enable better filtering and search capabilities.

3. **UUID Management**: Always use consistent UUIDs for the same content across updates.

4. **Error Handling**: Implement proper error handling and retry logic for embedding operations.

5. **Rate Limiting**: Be mindful of Vectorize and Workers AI rate limits.

6. **Content Deduplication**: Use content hashing to avoid duplicate embeddings.

7. **Regular Cleanup**: Periodically clean up old or failed embedding operations.

## Troubleshooting

### Common Issues

1. **Embedding Generation Fails**: Check Workers AI quota and model availability.

2. **Vectorize Operations Fail**: Verify index names and dimensions match.

3. **RAG Queries Return Empty Results**: Ensure content is properly embedded and indexed.

4. **Database Errors**: Check migration status and table schemas.

### Debug Endpoints

- `/api/embeddings/stats` - Check embedding statistics
- `/api/embeddings/operations` - View operation history
- `/api/rag/analytics` - RAG usage analytics

## Future Enhancements

1. **Multi-language Support**: Add support for non-English content.
2. **Custom Models**: Allow custom embedding models.
3. **Real-time Updates**: WebSocket support for real-time embedding updates.
4. **Advanced Filtering**: More sophisticated metadata filtering options.
5. **Caching**: Implement caching for frequently accessed embeddings.
6. **Batch Operations**: Support for bulk embedding operations.
