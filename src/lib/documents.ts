import { buildR2Url } from "../shared/utils/string.helpers";
import type { Env } from "./env";
import {
  computeEmbedding,
  shouldReindex,
  stripMarkdown,
  upsertVector,
} from "./vectorize";

export type DocumentType = "resume" | "cover_letter";
export type DocumentPurpose = "job_related" | "example" | "reference" | null;

export interface ResumeSections {
  summary?: string | null;
  contact?: string | null;
  skills?: string | null;
  experience?: string | null;
  education?: string | null;
  projects?: string | null;
  certifications?: string | null;
  extras?: string | null;
}

export interface ApplicantDocument {
  id: number;
  user_id: string;
  job_id?: string | null;
  doc_type: DocumentType;
  purpose?: DocumentPurpose;
  title?: string | null;
  r2_key_md?: string | null;
  r2_url_md?: string | null;
  r2_key_pdf?: string | null;
  r2_url_pdf?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicantDocumentWithSections extends ApplicantDocument {
  resume_sections?: ResumeSections | null;
  editor_json_url?: string | null;
}

export interface DocumentCreateInput {
  user_id: string;
  doc_type: DocumentType;
  purpose?: DocumentPurpose;
  job_id?: string | null;
  title?: string | null;
  content_md?: string | null;
  editor_json?: unknown;
  sections?: ResumeSections | null;
}

export interface DocumentUpdateInput {
  title?: string | null;
  content_md?: string | null;
  editor_json?: unknown;
  sections?: ResumeSections | null;
}

export interface VectorSearchRequest {
  q: string;
  user_id: string;
  job_id?: string | null;
  top_k?: number;
}

export interface DocumentSearchMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface DocumentSearchResponse {
  query: string;
  matches: DocumentSearchMatch[];
}

export interface PatchRangePosition {
  line: number;
  col: number;
}

export interface PatchRange {
  start: PatchRangePosition;
  end: PatchRangePosition;
}

export interface DocumentPatch {
  target: string;
  range: PatchRange;
  type: "replace" | "delete" | "insert";
  suggestion: string;
}

export interface ApplyPatchResult {
  updated: ApplicantDocumentWithSections;
  diffSummary: string[];
  reindexed: boolean;
}

export interface AtsEvaluationDimensionScores {
  keywords: number;
  action_verbs: number;
  impact_metrics: number;
  brevity: number;
  structure: number;
  seniority_alignment: number;
}

export interface AtsRecommendationPath {
  easiest: string;
  moderate: string;
  advanced: string;
}

export interface AtsRecommendation {
  target: string;
  range: PatchRange;
  type: "replace" | "delete" | "insert";
  message: string;
  suggestion: string;
  severity: "low" | "medium" | "high";
  paths: AtsRecommendationPath;
}

export interface AtsEvaluation {
  overall_score: number;
  dimensions: AtsEvaluationDimensionScores;
  recommendations: AtsRecommendation[];
  summary: string;
}

export interface DocumentGenerationInput {
  user_id: string;
  job_id: string;
  doc_type: DocumentType;
}

interface StoredAssets {
  mdKey: string | null;
  mdUrl: string | null;
  pdfKey: string | null;
  pdfUrl: string | null;
  editorKey: string | null;
  editorUrl: string | null;
}

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

export function serialiseEditorJson(editor: unknown): string {
  if (!editor) {
    return "";
  }

  if (typeof editor === "string") {
    return editor;
  }

  try {
    const nodes: string[] = [];

    const visit = (node: any, depth: number = 0) => {
      if (!node) {
        return;
      }

      if (typeof node === "string") {
        nodes.push(node);
        return;
      }

      const type = node.type || node.name;
      const content = node.content || [];

      if (type === "text" && typeof node.text === "string") {
        nodes.push(node.text);
        return;
      }

      if (type === "paragraph") {
        const text = Array.isArray(content)
          ? content
              .map((child: any) =>
                typeof child?.text === "string" ? child.text : ""
              )
              .join("")
          : "";
        nodes.push(text);
        nodes.push("");
        return;
      }

      if (type === "heading") {
        const level = node.attrs?.level || 1;
        const text = Array.isArray(content)
          ? content
              .map((child: any) =>
                typeof child?.text === "string" ? child.text : ""
              )
              .join("")
          : "";
        nodes.push(`${"#".repeat(Math.min(6, Math.max(1, level)))} ${text}`);
        nodes.push("");
        return;
      }

      if (type === "bulletList" || type === "orderedList") {
        const prefix = type === "orderedList" ? "1." : "-";
        (content || []).forEach((item: any) => {
          const line = Array.isArray(item?.content)
            ? item.content
                .map((child: any) =>
                  typeof child?.text === "string" ? child.text : ""
                )
                .join("")
            : "";
          nodes.push(`${prefix} ${line}`.trim());
        });
        nodes.push("");
        return;
      }

      if (Array.isArray(content)) {
        content.forEach((child) => visit(child, depth + 1));
      }
    };

    visit(editor);

    const markdown = nodes.join("\n");
    return markdown.trim().length > 0
      ? markdown.trim()
      : JSON.stringify(editor, null, 2);
  } catch (error) {
    console.warn(
      "Failed to serialise editor JSON; falling back to JSON string.",
      error
    );
    return JSON.stringify(editor, null, 2);
  }
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
): Promise<StoredAssets> {
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
  const row = await env.DB.prepare(
    "SELECT id, user_id, job_id, doc_type, purpose, title, r2_key_md, r2_url_md, r2_key_pdf, r2_url_pdf, created_at, updated_at FROM applicant_documents WHERE id = ?1"
  )
    .bind(id)
    .first();

  if (!row) {
    return null;
  }

  const resumeSections = await env.DB.prepare(
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

  const existing = await env.DB.prepare(
    "SELECT content_sha256 FROM document_embeddings WHERE document_id = ?1 AND vectorize_id = ?2 ORDER BY created_at DESC LIMIT 1"
  )
    .bind(documentId, vectorId)
    .first();

  const should = shouldReindex(
    existing?.content_sha256 || null,
    embedding.hash
  );

  console.debug("documents:upsertVector", {
    documentId,
    section: sectionKey,
    shouldReindex: should,
    hash: embedding.hash,
  });

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
      : serialiseEditorJson(input.editor_json);

  console.debug("documents:create", {
    user_id: input.user_id,
    doc_type: input.doc_type,
    job_id: input.job_id,
    title: input.title,
  });

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
  console.debug("documents:create:indexed", { documentId, reindexed });

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

  console.debug("documents:update", {
    id,
    hasContent: Boolean(input.content_md),
    hasSections: Boolean(input.sections),
  });

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
        : serialiseEditorJson(input.editor_json);

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
  console.debug("documents:update:indexed", { id, reindexed });

  return { document, reindexed };
}

export async function deleteApplicantDocument(
  env: Env,
  id: number
): Promise<void> {
  console.debug("documents:delete", { id });
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

export async function searchApplicantDocuments(
  env: Env,
  params: VectorSearchRequest
): Promise<DocumentSearchResponse> {
  const queryEmbedding = await computeEmbedding(env, params.q);
  if (!queryEmbedding) {
    return { query: params.q, matches: [] };
  }

  const filter: Record<string, unknown> = { user_id: params.user_id };
  if (params.job_id) {
    filter.job_id = params.job_id;
  }

  const result = await env.VECTORIZE_INDEX.query(queryEmbedding.embedding, {
    topK: params.top_k || 10,
    returnMetadata: true,
    filter,
  });

  const matches: DocumentSearchMatch[] = (result.matches || []).map(
    (match: any) => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata || {},
    })
  );

  return { query: params.q, matches };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreKeywords(resume: string, job: string): number {
  const resumeWords = new Set(
    stripMarkdown(resume)
      .toLowerCase()
      .split(/[^a-z0-9%]+/g)
      .filter(Boolean)
  );
  const jobWords = new Set(
    stripMarkdown(job)
      .toLowerCase()
      .split(/[^a-z0-9%]+/g)
      .filter(Boolean)
  );
  if (jobWords.size === 0) {
    return 50;
  }
  let matchCount = 0;
  jobWords.forEach((word) => {
    if (resumeWords.has(word)) {
      matchCount += 1;
    }
  });
  return (matchCount / Math.max(jobWords.size, 1)) * 100;
}

const ACTION_VERBS = [
  "led",
  "managed",
  "created",
  "built",
  "improved",
  "launched",
  "delivered",
  "accelerated",
  "optimized",
  "driven",
  "spearheaded",
  "designed",
  "implemented",
  "architected",
];

export function scoreActionVerbs(resume: string): number {
  const lower = stripMarkdown(resume).toLowerCase();
  const hits = ACTION_VERBS.filter((verb) => lower.includes(verb)).length;
  return clampScore((hits / ACTION_VERBS.length) * 100);
}

export function scoreImpact(resume: string): number {
  const tokens = stripMarkdown(resume).split(/\s+/);
  const metricTokens = tokens.filter((token) => /%|\d/.test(token));
  return clampScore((metricTokens.length / Math.max(tokens.length, 1)) * 400);
}

export function scoreBrevity(resume: string): number {
  const lines = resume.split(/\n+/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return 50;
  }
  const averageLength =
    lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
  return clampScore(100 - Math.max(0, averageLength - 120));
}

export function scoreStructure(resume: string): number {
  const lower = resume.toLowerCase();
  const requiredSections = ["experience", "education", "skills"];
  const hits = requiredSections.filter((section) =>
    lower.includes(section)
  ).length;
  return clampScore((hits / requiredSections.length) * 100 + 30);
}

export function scoreSeniority(resume: string, job: string): number {
  const resumeText = stripMarkdown(resume).toLowerCase();
  const jobText = stripMarkdown(job).toLowerCase();
  const seniorityKeywords = ["senior", "staff", "lead", "principal"];
  const resumeScore = seniorityKeywords.filter((word) =>
    resumeText.includes(word)
  ).length;
  const jobScore = seniorityKeywords.filter((word) =>
    jobText.includes(word)
  ).length;
  if (jobScore === 0) {
    return 60 + resumeScore * 10;
  }
  return clampScore((resumeScore / jobScore) * 100);
}

function buildRange(line: number): PatchRange {
  return {
    start: { line, col: 1 },
    end: { line, col: 120 },
  };
}

export function buildRecommendation(
  line: number,
  target: string,
  suggestion: string
): AtsRecommendation {
  return {
    target,
    range: buildRange(line),
    type: "replace",
    message: "Enhance this section for stronger alignment.",
    suggestion,
    severity: "medium",
    paths: {
      easiest: "Add a keyword from the job posting.",
      moderate: "Rewrite the bullet with an action verb and metric.",
      advanced: suggestion,
    },
  };
}

async function fetchJobMarkdown(env: Env, jobId: string): Promise<string> {
  const job = await env.DB.prepare(
    "SELECT description_md, requirements_md, title, company FROM jobs WHERE id = ?1"
  )
    .bind(jobId)
    .first();
  if (!job) {
    throw new Error("Job not found");
  }
  const parts = [
    job.title && `# ${job.title}`,
    job.company && `**Company:** ${job.company}`,
    job.description_md,
    job.requirements_md,
  ].filter((value): value is string => Boolean(value));
  return parts.join("\n\n");
}

export async function evaluateDocumentAgainstJob(
  env: Env,
  documentId: number,
  jobId: string
): Promise<AtsEvaluation> {
  console.debug("documents:ats:evaluate", { documentId, jobId });
  const document = await loadDocumentRecord(env, documentId);
  if (!document) {
    throw new Error("Document not found");
  }

  const resumeMarkdown = await readR2Text(env, document.r2_key_md);
  const jobMarkdown = await fetchJobMarkdown(env, jobId);

  const keywordsScore = scoreKeywords(resumeMarkdown, jobMarkdown);
  const actionVerbScore = scoreActionVerbs(resumeMarkdown);
  const impactScore = scoreImpact(resumeMarkdown);
  const brevityScore = scoreBrevity(resumeMarkdown);
  const structureScore = scoreStructure(resumeMarkdown);
  const seniorityScore = scoreSeniority(resumeMarkdown, jobMarkdown);

  const overall = clampScore(
    (keywordsScore +
      actionVerbScore +
      impactScore +
      brevityScore +
      structureScore +
      seniorityScore) /
      6
  );

  const lines = resumeMarkdown.split("\n");
  const recommendations: AtsRecommendation[] = [];

  lines.forEach((line, index) => {
    if (line.trim().length === 0) {
      return;
    }

    if (!/[0-9%]/.test(line) && /managed|led|responsible/i.test(line)) {
      const suggestion = `${line.trim()} (Add a measurable outcome such as "resulting in a 20% uplift").`;
      recommendations.push(
        buildRecommendation(index + 1, "experience", suggestion)
      );
    }
  });

  const summary = `Overall ATS alignment score of ${overall}. Focus on boosting impact metrics and keyword coverage to improve fit for job ${jobId}.`;

  return {
    overall_score: overall,
    dimensions: {
      keywords: clampScore(keywordsScore),
      action_verbs: clampScore(actionVerbScore),
      impact_metrics: clampScore(impactScore),
      brevity: clampScore(brevityScore),
      structure: clampScore(structureScore),
      seniority_alignment: clampScore(seniorityScore),
    },
    recommendations,
    summary,
  };
}

async function buildUserProfileSummary(
  env: Env,
  userId: string
): Promise<string> {
  const profile = await env.DB.prepare(
    "SELECT name, current_title, target_roles, skills FROM applicant_profiles WHERE user_id = ?1"
  )
    .bind(userId)
    .first();

  const lines: string[] = [];
  if (profile?.name) {
    lines.push(`Name: ${profile.name}`);
  }
  if (profile?.current_title) {
    lines.push(`Current Title: ${profile.current_title}`);
  }
  if (profile?.target_roles) {
    lines.push(`Target Roles: ${profile.target_roles}`);
  }
  if (profile?.skills) {
    lines.push(`Skills: ${profile.skills}`);
  }

  return lines.join("\n");
}

async function callDocumentGenerator(
  env: Env,
  prompt: string
): Promise<string> {
  const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content:
          "You craft ATS-friendly professional documents using Markdown formatting.",
      },
      { role: "user", content: prompt },
    ],
  });

  return response?.response && typeof response.response === "string"
    ? response.response
    : JSON.stringify(response?.response || "", null, 2);
}

export async function generateDocumentForJob(
  env: Env,
  input: DocumentGenerationInput
): Promise<ApplicantDocumentWithSections> {
  const documentTypeLabel =
    input.doc_type === "resume" ? "resume" : "cover letter";
  const jobMarkdown = await fetchJobMarkdown(env, input.job_id);
  const profileSummary = await buildUserProfileSummary(env, input.user_id);

  const prompt = [
    `Create a tailored ${documentTypeLabel} in Markdown.`,
    "",
    "User Profile:",
    profileSummary,
    "",
    "Job Description:",
    jobMarkdown,
  ].join("\n");

  console.debug("documents:generate", {
    user_id: input.user_id,
    job_id: input.job_id,
    doc_type: input.doc_type,
  });

  const generatedMarkdown = await callDocumentGenerator(env, prompt);

  let sections: ResumeSections | undefined;
  if (input.doc_type === "resume") {
    const splitter = generatedMarkdown.split("\n\n");
    sections = {
      summary: splitter[0] || null,
      experience: splitter.slice(1, 4).join("\n\n") || null,
      skills: splitter.slice(4).join("\n\n") || null,
    };
  }

  return createApplicantDocument(env, {
    user_id: input.user_id,
    doc_type: input.doc_type,
    purpose: "job_related",
    job_id: input.job_id,
    title: `${documentTypeLabel} for ${input.job_id}`,
    content_md: generatedMarkdown,
    sections,
  });
}

function comparePositions(
  a: PatchRangePosition,
  b: PatchRangePosition
): number {
  if (a.line === b.line) {
    return a.col - b.col;
  }
  return a.line - b.line;
}

function offsetFromPosition(
  text: string,
  position: PatchRangePosition
): number {
  const lines = text.split("\n");
  const lineIndex = Math.max(0, Math.min(position.line - 1, lines.length - 1));
  let offset = 0;
  for (let i = 0; i < lineIndex; i += 1) {
    offset += lines[i].length + 1;
  }
  const col = Math.max(1, position.col);
  return offset + (col - 1);
}

function applyPatchSequence(
  content: string,
  patches: DocumentPatch[]
): { text: string; summary: string[] } {
  const sorted = [...patches]
    .filter((patch) => patch?.range?.start)
    .sort((a, b) => comparePositions(b.range.start, a.range.start));
  let text = content;
  const summary: string[] = [];

  sorted.forEach((patch) => {
    const start = offsetFromPosition(text, patch.range.start);
    const end = offsetFromPosition(text, patch.range.end);

    if (patch.type === "insert") {
      text = `${text.slice(0, start)}${patch.suggestion}${text.slice(start)}`;
      summary.push(`Inserted suggestion at line ${patch.range.start.line}`);
    } else if (patch.type === "delete") {
      text = `${text.slice(0, start)}${text.slice(end)}`;
      summary.push(`Deleted range starting at line ${patch.range.start.line}`);
    } else {
      text = `${text.slice(0, start)}${patch.suggestion}${text.slice(end)}`;
      summary.push(`Replaced content at line ${patch.range.start.line}`);
    }
  });

  return { text, summary: summary.reverse() };
}

export async function applyDocumentPatches(
  env: Env,
  id: number,
  patches: DocumentPatch[]
): Promise<ApplyPatchResult> {
  const document = await loadDocumentRecord(env, id);
  if (!document) {
    throw new Error("Document not found");
  }

  console.debug("documents:applyPatches", { id, patchCount: patches.length });

  const markdown = await readR2Text(env, document.r2_key_md);
  const { text, summary } = applyPatchSequence(markdown, patches);

  await storeDocumentAssets(env, id, text);

  await env.DB.prepare(
    "UPDATE applicant_documents SET updated_at = ?1 WHERE id = ?2"
  )
    .bind(nowIso(), id)
    .run();

  const reindexed = await indexDocument(env, document, text);

  const updated = await loadDocumentRecord(env, id);
  if (!updated) {
    throw new Error("Failed to reload document after patches");
  }

  return { updated, diffSummary: summary, reindexed };
}
