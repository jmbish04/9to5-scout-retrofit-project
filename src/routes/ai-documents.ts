import type { Env } from "../domains/config/env/env.config";

interface CoverLetterRequestBody {
  job_title: string;
  company_name: string;
  hiring_manager_name?: string;
  job_description_text: string;
  candidate_career_summary: string;
}

interface CoverLetterContent {
  salutation: string;
  opening_paragraph: string;
  body_paragraph_1: string;
  body_paragraph_2: string;
  closing_paragraph: string;
}

interface ResumeRequestBody {
  job_title: string;
  company_name: string;
  job_description_text: string;
  candidate_career_summary: string;
}

interface ResumeContent {
  summary: string;
  experience_bullets: string[];
  skills: string[];
}

export async function handleCoverLetterPost(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as CoverLetterRequestBody;
  if (
    !body.job_title ||
    !body.company_name ||
    !body.job_description_text ||
    !body.candidate_career_summary
  ) {
    return new Response(
      JSON.stringify({ error: "Missing required fields in request body" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const coverLetterSchema = {
    type: "object",
    properties: {
      salutation: {
        type: "string",
        description: "The salutation (e.g., Dear Hiring Manager,)",
      },
      opening_paragraph: {
        type: "string",
        description: "Compelling introduction tailored to the job and company",
      },
      body_paragraph_1: {
        type: "string",
        description: "First body paragraph with quantified achievements",
      },
      body_paragraph_2: {
        type: "string",
        description:
          "Second body paragraph highlighting company fit and motivation",
      },
      closing_paragraph: {
        type: "string",
        description: "Closing paragraph with call to action and sign-off",
      },
    },
    required: [
      "salutation",
      "opening_paragraph",
      "body_paragraph_1",
      "body_paragraph_2",
      "closing_paragraph",
    ],
  };

  const prompt = `You are an expert career coach and copywriter specializing in crafting tailored cover letters.
  Generate a polished cover letter for the following candidate and job:

  Candidate Summary:
  ${body.candidate_career_summary}

  Job Title: ${body.job_title}
  Company: ${body.company_name}
  Hiring Manager: ${body.hiring_manager_name || "Unknown"}

  Job Description:
  ${body.job_description_text}

  The cover letter should be concise, professional, and tailored to the job requirements.`;

  const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content:
          "You are an expert career coach and copywriter. Generate structured cover letters that are polished, professional, and tailored to the job description provided.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "cover_letter_response",
        schema: coverLetterSchema,
      },
    },
  });

  const structured = JSON.parse(
    response.response || "{}"
  ) as CoverLetterContent;

  return new Response(JSON.stringify(structured), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleResumePost(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as ResumeRequestBody;
  if (
    !body.job_title ||
    !body.company_name ||
    !body.job_description_text ||
    !body.candidate_career_summary
  ) {
    return new Response(
      JSON.stringify({ error: "Missing required fields in request body" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const resumeSchema = {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "A tailored professional summary",
      },
      experience_bullets: {
        type: "array",
        description: "High impact resume bullet points",
        items: { type: "string" },
      },
      skills: {
        type: "array",
        description: "Key skills matched to the job description",
        items: { type: "string" },
      },
    },
    required: ["summary", "experience_bullets", "skills"],
  };

  const prompt = `You are an expert resume writer.
  Generate a tailored resume summary, three experience bullet points, and a skills list for the following candidate and job:

  Candidate Summary:
  ${body.candidate_career_summary}

  Job Title: ${body.job_title}
  Company: ${body.company_name}

  Job Description:
  ${body.job_description_text}

  The output should be concise, targeted, and incorporate relevant keywords.`;

  const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content:
          "You are an expert resume writer. Return structured resume content tailored to the provided job description.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "resume_response",
        schema: resumeSchema,
      },
    },
  });

  const structured = JSON.parse(response.response || "{}") as ResumeContent;

  return new Response(JSON.stringify(structured), {
    headers: { "Content-Type": "application/json" },
  });
}
