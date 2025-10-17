PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS applicant_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  job_id TEXT,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('resume','cover_letter')),
  purpose TEXT,
  r2_key_md TEXT,
  r2_url_md TEXT,
  r2_key_pdf TEXT,
  r2_url_pdf TEXT,
  title TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_applicant_documents_user ON applicant_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_applicant_documents_job ON applicant_documents(job_id);

CREATE TABLE IF NOT EXISTS resume_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  summary TEXT,
  contact TEXT,
  skills TEXT,
  experience TEXT,
  education TEXT,
  projects TEXT,
  certifications TEXT,
  extras TEXT,
  FOREIGN KEY(document_id) REFERENCES applicant_documents(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_resume_sections_document ON resume_sections(document_id);

CREATE TABLE IF NOT EXISTS document_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  model TEXT NOT NULL,
  vector_size INTEGER NOT NULL,
  vectorize_id TEXT,
  content_sha256 TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(document_id) REFERENCES applicant_documents(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_doc_embedding_on_sha ON document_embeddings(content_sha256);
CREATE INDEX IF NOT EXISTS idx_doc_embedding_doc ON document_embeddings(document_id);
