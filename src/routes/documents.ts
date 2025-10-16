import type { Env } from '../lib/env';
import {
  applyDocumentPatches,
  createApplicantDocument,
  deleteApplicantDocument,
  evaluateDocumentAgainstJob,
  generateDocumentForJob,
  getApplicantDocument,
  searchApplicantDocuments,
  updateApplicantDocument,
  type DocumentCreateInput,
  type DocumentUpdateInput,
  type VectorSearchRequest,
  type DocumentPatch,
  type DocumentGenerationInput,
} from '../lib/documents';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleDocsCreate(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as DocumentCreateInput;
  const document = await createApplicantDocument(env, body);
  return jsonResponse({ document, resume_sections: document.resume_sections || null }, 201);
}

export async function handleDocsGet(request: Request, env: Env, id: number): Promise<Response> {
  const document = await getApplicantDocument(env, id);
  if (!document) {
    return jsonResponse({ error: 'Document not found' }, 404);
  }
  return jsonResponse({ document, resume_sections: document.resume_sections || null });
}

export async function handleDocsUpdate(request: Request, env: Env, id: number): Promise<Response> {
  const body = (await request.json()) as DocumentUpdateInput;
  const result = await updateApplicantDocument(env, id, body);
  if (!result) {
    return jsonResponse({ error: 'Document not found' }, 404);
  }
  return jsonResponse({ document: result.document, resume_sections: result.document.resume_sections || null, status: { reindexed: result.reindexed } });
}

export async function handleDocsDelete(_request: Request, env: Env, id: number): Promise<Response> {
  await deleteApplicantDocument(env, id);
  return new Response(null, { status: 204 });
}

export async function handleDocsSearch(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as VectorSearchRequest;
  if (!body?.q || !body?.user_id) {
    return jsonResponse({ error: 'Both q and user_id are required' }, 400);
  }
  const result = await searchApplicantDocuments(env, body);
  return jsonResponse(result);
}

export async function handleAtsEvaluate(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { document_id: number; job_id: string };
  if (!body?.document_id || !body?.job_id) {
    return jsonResponse({ error: 'document_id and job_id are required' }, 400);
  }
  const evaluation = await evaluateDocumentAgainstJob(env, Number(body.document_id), body.job_id);
  return jsonResponse(evaluation);
}

export async function handleDocumentGenerate(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as DocumentGenerationInput;
  if (!body.user_id || !body.job_id || !body.doc_type) {
    return jsonResponse({ error: 'user_id, job_id and doc_type are required' }, 400);
  }
  const document = await generateDocumentForJob(env, body);
  return jsonResponse({ document, resume_sections: document.resume_sections || null }, 201);
}

export async function handleDocsApplyPatches(request: Request, env: Env, id: number): Promise<Response> {
  const body = (await request.json()) as { patches: DocumentPatch[] };
  if (!body?.patches || !Array.isArray(body.patches)) {
    return jsonResponse({ error: 'patches array is required' }, 400);
  }
  const result = await applyDocumentPatches(env, id, body.patches);
  return jsonResponse({ document: result.updated, diff_summary: result.diffSummary, status: { reindexed: result.reindexed } });
}
