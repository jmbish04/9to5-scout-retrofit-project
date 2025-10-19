import type { Env } from "../../../lib/env";
import { createApplicantDocument } from "./document-storage.service";
import type {
  ApplicantDocumentWithSections,
  DocumentGenerationInput,
  ResumeSections,
} from "../types/documents.types";

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

async function buildUserProfileSummary(
  env: Env,
  userId: string
): Promise<string> {
  const profile: {
    name: string;
    current_title: string;
    target_roles: string;
    skills: string;
  } | null = await env.DB.prepare(
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

  return (response as any)?.response || "";
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
