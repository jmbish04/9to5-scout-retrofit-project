import type { Env } from "../../../lib/env";
import { getApplicantDocument } from "./document-storage.service";
import type {
  ApplicantDocumentWithSections,
  AtsEvaluation,
  AtsRecommendation,
  DocumentPatch,
  PatchRange,
  ApplyPatchResult,
} from "../types/documents.types";
import { stripMarkdown } from "../../../lib/vectorize";

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
  const job: {
    description_md: string;
    requirements_md: string;
    title: string;
    company: string;
  } | null = await env.DB.prepare(
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
  const document = await getApplicantDocument(env, documentId);
  if (!document) {
    throw new Error("Document not found");
  }

  const resumeMarkdown = await env.R2.get(document.r2_key_md || "").then((r) =>
    r ? r.text() : ""
  );
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

function applyPatchSequence(
  content: string,
  patches: DocumentPatch[]
): { text: string; summary: string[] } {
  const sorted = [...patches]
    .filter((patch) => patch?.range?.start)
    .sort((a, b) => {
      if (a.range.start.line === b.range.start.line) {
        return b.range.start.col - a.range.start.col;
      }
      return b.range.start.line - a.range.start.line;
    });

  let text = content;
  const summary: string[] = [];

  sorted.forEach((patch) => {
    const lines = text.split("\n");
    const { start, end } = patch.range;
    const startLine = lines[start.line - 1];
    const endLine = lines[end.line - 1];

    if (startLine === undefined || endLine === undefined) {
      return;
    }

    const prefix = startLine.substring(0, start.col - 1);
    const suffix = endLine.substring(end.col - 1);

    if (patch.type === "insert") {
      lines[start.line - 1] = `${prefix}${patch.suggestion}${suffix}`;
      summary.push(`Inserted suggestion at line ${patch.range.start.line}`);
    } else if (patch.type === "delete") {
      lines.splice(start.line - 1, end.line - start.line + 1, `${prefix}${suffix}`);
      summary.push(`Deleted range starting at line ${patch.range.start.line}`);
    } else {
      lines.splice(start.line - 1, end.line - start.line + 1, `${prefix}${patch.suggestion}${suffix}`);
      summary.push(`Replaced content at line ${patch.range.start.line}`);
    }
    text = lines.join("\n");
  });

  return { text, summary: summary.reverse() };
}

export async function applyDocumentPatches(
  env: Env,
  id: number,
  patches: DocumentPatch[]
): Promise<ApplyPatchResult> {
  const document = await getApplicantDocument(env, id);
  if (!document) {
    throw new Error("Document not found");
  }

  const markdown = await env.R2.get(document.r2_key_md || "").then((r) =>
    r ? r.text() : ""
  );
  const { text, summary } = applyPatchSequence(markdown, patches);

  await env.R2.put(document.r2_key_md || "", text);
  await env.DB.prepare(
    "UPDATE applicant_documents SET updated_at = ?1 WHERE id = ?2"
  )
    .bind(new Date().toISOString(), id)
    .run();

  const reindexed = false; // Placeholder

  const updated = await getApplicantDocument(env, id);
  if (!updated) {
    throw new Error("Failed to reload document after patches");
  }

  return {
    updated,
    diffSummary: summary,
    reindexed,
  };
}
