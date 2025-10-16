import type { Env } from './env';
import { evaluateDocumentAgainstJob, generateDocumentForJob } from './documents';

let registered = false;

export function ensureAgentTools(env: Env) {
  if (registered) {
    return;
  }

  const agents = env.AGENTS;
  if (!agents || typeof agents.registerTool !== 'function') {
    return;
  }

  agents.registerTool('atsEvaluator', {
    description: 'Evaluate a resume or cover letter against a job posting and return ATS-style feedback.',
    async handler({ document_id, job_id }: { document_id: number; job_id: string }) {
      return evaluateDocumentAgainstJob(env, Number(document_id), job_id);
    },
  });

  agents.registerTool('docGenerator', {
    description: 'Generate a tailored resume or cover letter for a given job.',
    async handler({ user_id, job_id, doc_type }: { user_id: string; job_id: string; doc_type: 'resume' | 'cover_letter' }) {
      const document = await generateDocumentForJob(env, { user_id, job_id, doc_type });
      return { document_id: document.id, document };
    },
  });

  registered = true;
}
