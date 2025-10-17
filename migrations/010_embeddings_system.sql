-- Embeddings and UUID tracking system
-- This migration adds support for vector embeddings and UUID tracking

-- Table to track all assets with their UUIDs and embeddings
CREATE TABLE asset_embeddings (
  id TEXT PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL, -- 'job_opening', 'resume', 'cover_letter', 'general_content'
  vectorize_index TEXT NOT NULL, -- which Vectorize index this belongs to
  vector_id TEXT NOT NULL, -- ID in the Vectorize index
  content_hash TEXT NOT NULL, -- hash of the content for deduplication
  content_preview TEXT, -- first 500 chars for preview
  metadata_json TEXT, -- additional metadata as JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table to track embedding operations and their status
CREATE TABLE embedding_operations (
  id TEXT PRIMARY KEY,
  asset_uuid TEXT REFERENCES asset_embeddings(uuid),
  operation_type TEXT NOT NULL, -- 'create', 'update', 'delete'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  vectorize_index TEXT NOT NULL,
  vector_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- Table to track RAG queries and their results
CREATE TABLE rag_queries (
  id TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_embedding_json TEXT, -- the vector embedding as JSON array
  vectorize_index TEXT NOT NULL,
  results_json TEXT, -- search results as JSON
  user_id TEXT, -- optional user ID for personalization
  session_id TEXT, -- optional session ID for tracking
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table to track agent interactions with RAG
CREATE TABLE agent_rag_interactions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  query_id TEXT REFERENCES rag_queries(id),
  response_text TEXT,
  context_used_json TEXT, -- which context was used from RAG results
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_asset_embeddings_uuid ON asset_embeddings(uuid);
CREATE INDEX idx_asset_embeddings_content_type ON asset_embeddings(content_type);
CREATE INDEX idx_asset_embeddings_vectorize_index ON asset_embeddings(vectorize_index);
CREATE INDEX idx_asset_embeddings_content_hash ON asset_embeddings(content_hash);

CREATE INDEX idx_embedding_operations_status ON embedding_operations(status);
CREATE INDEX idx_embedding_operations_asset_uuid ON embedding_operations(asset_uuid);
CREATE INDEX idx_embedding_operations_created_at ON embedding_operations(created_at);

CREATE INDEX idx_rag_queries_vectorize_index ON rag_queries(vectorize_index);
CREATE INDEX idx_rag_queries_user_id ON rag_queries(user_id);
CREATE INDEX idx_rag_queries_created_at ON rag_queries(created_at);

CREATE INDEX idx_agent_rag_interactions_agent_id ON agent_rag_interactions(agent_id);
CREATE INDEX idx_agent_rag_interactions_query_id ON agent_rag_interactions(query_id);
CREATE INDEX idx_agent_rag_interactions_created_at ON agent_rag_interactions(created_at);
