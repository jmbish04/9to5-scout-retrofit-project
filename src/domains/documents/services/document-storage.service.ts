import { buildR2Url } from "../../../shared/utils/string.helpers";
import type { Env } from "../../../lib/env";
import {
  computeEmbedding,
  shouldReindex,
  stripMarkdown,
  upsertVector,
} from "../../../lib/vectorize";
import type {
  ApplicantDocument,
  ApplicantDocumentWithSections,
  DocumentCreateInput,
  DocumentUpdateInput,
  ResumeSections,
  DocumentType,
} from "../types/documents.types";

function nowIso(): string {
  return new Date().toISOString();
}

function getBucket(env: Env) {
  return env.RESUME_BUCKET || env.R2;
}

function ensureBucket(env: Env) {
  const bucket = getBucket(env);
  if (!bucket) {
    throw new Error("RESUME_BUCKET binding is not configured.");
  }
  return bucket;
}

async function storeAsset(
  env: Env,
  key: string,
  value: string | ArrayBuffer,
  contentType: string
): Promise<{ key: string; url: string | null }> {
  const bucket = ensureBucket(env);
  await bucket.put(key, value, {
    httpMetadata: { contentType },
  });
  return { key, url: buildR2Url(env.BUCKET_BASE_URL, key) };
}

async function storeDocumentAssets(
  env: Env,
  documentId: number,
  markdown: string,
  editorJson?: unknown
): Promise<{
  mdKey: string | null;
  mdUrl: string | null;
  pdfKey: string | null;
  pdfUrl: string | null;
  editorKey: string | null;
  editorUrl: string | null;
}> {
  const mdKey = `documents/${documentId}/document.md`;
  const pdfKey = `documents/${documentId}/document.pdf`;
  const editorKey = editorJson ? `documents/${documentId}/editor.json` : null;

  const mdResult = await storeAsset(env, mdKey, markdown, "text/markdown");

  const pdfContent = new TextEncoder().encode(
    `PDF rendering placeholder generated at ${nowIso()}\n\n${markdown}`
  );
  const pdfResult = await storeAsset(
    env,
    pdfKey,
    pdfContent,
    "application/pdf"
  );

  let editorResult: { key: string; url: string | null } | null = null;
  if (editorKey) {
    const editorString =
      typeof editorJson === "string" ? editorJson : JSON.stringify(editorJson);
    editorResult = await storeAsset(
      env,
      editorKey,
      editorString,
      "application/json"
    );
  }

  return {
    mdKey: mdResult.key,
    mdUrl: mdResult.url,
    pdfKey: pdfResult.key,
    pdfUrl: pdfResult.url,
    editorKey: editorResult?.key || null,
    editorUrl: editorResult?.url || null,
  };
}

async function readR2Text(
  env: Env,
  key: string | null | undefined
): Promise<string> {
  if (!key) {
    return "";
  }
  const bucket = ensureBucket(env);
  const obj = await bucket.get(key);
  if (!obj) {
    return "";
  }
  return obj.text();
}

async function loadDocumentRecord(
  env: Env,
  id: number
): Promise<ApplicantDocumentWithSections | null> {
  const row: ApplicantDocument | null = await env.DB.prepare(
    "SELECT id, user_id, job_id, doc_type, purpose, title, r2_key_md, r2_url_md, r2_key_pdf, r2_url_pdf, created_at, updated_at FROM applicant_documents WHERE id = ?1"
  )
    .bind(id)
    .first();

  if (!row) {
    return null;
  }

  const resumeSections: ResumeSections | null = await env.DB.prepare(
    "SELECT summary, contact, skills, experience, education, projects, certifications, extras FROM resume_sections WHERE document_id = ?1"
  )
    .bind(id)
    .first();

  const editorUrl = buildR2Url(
    env.BUCKET_BASE_URL,
    `documents/${id}/editor.json`
  );

  return {
    ...row,
    resume_sections: resumeSections || undefined,
    editor_json_url: editorUrl,
  };
}

export function buildResumeSectionInsert(
  documentId: number,
  sections?: ResumeSections | null
) {
  if (!sections) {
    return null;
  }

  return {
    sql: `INSERT INTO resume_sections (
      document_id, summary, contact, skills, experience, education, projects, certifications, extras
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    ON CONFLICT(document_id) DO UPDATE SET
      summary = excluded.summary,
      contact = excluded.contact,
      skills = excluded.skills,
      experience = excluded.experience,
      education = excluded.education,
      projects = excluded.projects,
      certifications = excluded.certifications,
      extras = excluded.extras`,
    binds: [
      documentId,
      sections.summary || null,
      sections.contact || null,
      sections.skills || null,
      sections.experience || null,
      sections.education || null,
      sections.projects || null,
      sections.certifications || null,
      sections.extras || null,
    ],
  };
}

async function upsertResumeSections(
  env: Env,
  documentId: number,
  docType: DocumentType,
  sections?: ResumeSections | null
) {
  if (docType !== "resume" || !sections) {
    return;
  }

  const payload = buildResumeSectionInsert(documentId, sections);
  if (payload) {
    await env.DB.prepare(payload.sql)
      .bind(...payload.binds)
      .run();
  }
}

async function recordEmbedding(
  env: Env,
  documentId: number,
  doc: ApplicantDocument,
  sectionKey: string,
  text: string
): Promise<boolean> {
  const embedding = await computeEmbedding(env, text);
  if (!embedding) {
    return false;
  }

  const vectorId = `doc-${documentId}-${sectionKey}`;

  const existing: { content_sha256: string } | null = await env.DB.prepare(
    "SELECT content_sha256 FROM document_embeddings WHERE document_id = ?1 AND vectorize_id = ?2 ORDER BY created_at DESC LIMIT 1"
  )
    .bind(documentId, vectorId)
    .first();

  const should = shouldReindex(
    existing?.content_sha256 || null,
    embedding.hash
  );

  await upsertVector(env, vectorId, embedding.embedding, {
    document_id: documentId,
    doc_type: doc.doc_type,
    user_id: doc.user_id,
    job_id: doc.job_id || null,
    content_sha256: embedding.hash,
    section: sectionKey,
  });

  if (should) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO document_embeddings (document_id, model, vector_size, vectorize_id, content_sha256) VALUES (?1, ?2, ?3, ?4, ?5)"
    )
      .bind(
        documentId,
        env.EMBEDDING_MODEL || "@cf/baai/bge-large-en-v1.5",
        embedding.embedding.length,
        vectorId,
        embedding.hash
      )
      .run();
  }

  return should;
}

async function indexDocument(
  env: Env,
  document: ApplicantDocumentWithSections,
  markdown: string
): Promise<boolean> {
  let reindexed = false;
  const baseText = markdown || "";

  if (baseText.trim().length > 0) {
    const changed = await recordEmbedding(
      env,
      document.id,
      document,
      "full",
      baseText
    );
    reindexed = reindexed || changed;
  }

  if (document.doc_type === "resume" && document.resume_sections) {
    const sections = document.resume_sections;
    const pairs: Array<[string, string | null | undefined]> = [
      ["summary", sections.summary],
      ["contact", sections.contact],
      ["skills", sections.skills],
      ["experience", sections.experience],
      ["education", sections.education],
      ["projects", sections.projects],
      ["certifications", sections.certifications],
      ["extras", sections.extras],
    ];

    for (const [key, value] of pairs) {
      if (value && stripMarkdown(value).length > 0) {
        const changed = await recordEmbedding(
          env,
          document.id,
          document,
          key,
          value
        );
        reindexed = reindexed || changed;
      }
    }
  }

  return reindexed;
}

export async function createApplicantDocument(
  env: Env,
  input: DocumentCreateInput
): Promise<ApplicantDocumentWithSections> {
  if (!input.user_id) {
    throw new Error("user_id is required");
  }
  if (input.doc_type !== "resume" && input.doc_type !== "cover_letter") {
    throw new Error('doc_type must be "resume" or "cover_letter"');
  }

  const markdown =
    input.content_md && input.content_md.trim().length > 0
      ? input.content_md.trim()
      : ""; // serialiseEditorJson(input.editor_json);

  const insertResult = await env.DB.prepare(
    "INSERT INTO applicant_documents (user_id, job_id, doc_type, purpose, title) VALUES (?1, ?2, ?3, ?4, ?5)"
  )
    .bind(
      input.user_id,
      input.job_id || null,
      input.doc_type,
      input.purpose || null,
      input.title || null
    )
    .run();

  const documentId = Number(insertResult.meta.last_row_id);

  const assets = await storeDocumentAssets(
    env,
    documentId,
    markdown,
    input.editor_json
  );

  await env.DB.prepare(
    "UPDATE applicant_documents SET r2_key_md = ?1, r2_url_md = ?2, r2_key_pdf = ?3, r2_url_pdf = ?4, updated_at = ?5 WHERE id = ?6"
  )
    .bind(
      assets.mdKey,
      assets.mdUrl,
      assets.pdfKey,
      assets.pdfUrl,
      nowIso(),
      documentId
    )
    .run();

  await upsertResumeSections(
    env,
    documentId,
    input.doc_type,
    input.sections || null
  );

  const document = await loadDocumentRecord(env, documentId);
  if (!document) {
    throw new Error("Failed to load newly created document");
  }

  const reindexed = await indexDocument(env, document, markdown);

  return {
    ...document,
    resume_sections:
      input.doc_type === "resume"
        ? document.resume_sections || input.sections || undefined
        : undefined,
    editor_json_url: assets.editorUrl || document.editor_json_url || null,
  };
}

export async function getApplicantDocument(
  env: Env,
  id: number
): Promise<ApplicantDocumentWithSections | null> {
  return loadDocumentRecord(env, id);
}

export async function updateApplicantDocument(
  env: Env,
  id: number,
  input: DocumentUpdateInput
): Promise<{
  document: ApplicantDocumentWithSections;
  reindexed: boolean;
} | null> {
  const existing = await loadDocumentRecord(env, id);
  if (!existing) {
    return null;
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (input.title !== undefined) {
    updateFields.push("title = ?");
    updateValues.push(input.title);
  }

  let markdown: string | null = null;

  if (input.content_md || input.editor_json) {
    markdown =
      input.content_md && input.content_md.trim().length > 0
        ? input.content_md.trim()
        : ""; // serialiseEditorJson(input.editor_json);

    const assets = await storeDocumentAssets(
      env,
      id,
      markdown,
      input.editor_json
    );
    updateFields.push("r2_key_md = ?");
    updateValues.push(assets.mdKey);
    updateFields.push("r2_url_md = ?");
    updateValues.push(assets.mdUrl);
    updateFields.push("r2_key_pdf = ?");
    updateValues.push(assets.pdfKey);
    updateFields.push("r2_url_pdf = ?");
    updateValues.push(assets.pdfUrl);
    existing.r2_key_md = assets.mdKey;
    existing.r2_url_md = assets.mdUrl;
    existing.r2_key_pdf = assets.pdfKey;
    existing.r2_url_pdf = assets.pdfUrl;
    existing.editor_json_url = assets.editorUrl;
  }

  if (updateFields.length > 0) {
    updateFields.push("updated_at = ?");
    updateValues.push(nowIso());
    updateValues.push(id);
    await env.DB.prepare(
      `UPDATE applicant_documents SET ${updateFields.join(", ")} WHERE id = ?`
    )
      .bind(...updateValues)
      .run();
  }

  await upsertResumeSections(
    env,
    id,
    existing.doc_type,
    input.sections || existing.resume_sections || undefined
  );

  const document = await loadDocumentRecord(env, id);
  if (!document) {
    throw new Error("Document disappeared after update.");
  }

  const markdownContent =
    markdown !== null ? markdown : await readR2Text(env, document.r2_key_md);
  const reindexed = await indexDocument(env, document, markdownContent);

  return { document, reindexed };
}

export async function deleteApplicantDocument(
  env: Env,
  id: number
): Promise<void> {
  const embeddings = await env.DB.prepare(
    "SELECT vectorize_id FROM document_embeddings WHERE document_id = ?1"
  )
    .bind(id)
    .all();

  const ids = (embeddings.results || [])
    .map((row: any) => row.vectorize_id)
    .filter((value: any): value is string => Boolean(value));

  if (ids.length > 0 && env.VECTORIZE_INDEX?.delete) {
    try {
      await env.VECTORIZE_INDEX.delete(ids);
    } catch (error) {
      console.warn("Failed to delete vectors for document", { id, error });
    }
  }

  await env.DB.prepare("DELETE FROM applicant_documents WHERE id = ?1")
    .bind(id)
    .run();
}
