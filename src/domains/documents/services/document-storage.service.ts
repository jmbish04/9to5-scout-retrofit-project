/**
 * @module src/domains/documents/services/document-storage.service.ts
 * @description
 * Service for CRUD operations and storage interactions (D1, R2) for documents.
 */

import { z } from 'zod';
import { NotFoundError, DatabaseError } from '../../../core/errors';

const ApplicantDocumentSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string(),
    doc_type: z.string(),
    // ... other fields
});
type ApplicantDocument = z.infer<typeof ApplicantDocumentSchema>;
type DocumentCreateInput = Omit<ApplicantDocument, 'id'>;
type DocumentUpdateInput = Partial<DocumentCreateInput>;


export interface DocumentStorageEnv {
  DB: D1Database;
  R2: R2Bucket;
}

export class DocumentStorageService {
  private env: DocumentStorageEnv;

  constructor(env: DocumentStorageEnv) {
    this.env = env;
  }

  async createApplicantDocument(data: DocumentCreateInput): Promise<ApplicantDocument> {
    const id = crypto.randomUUID();
    const newDoc = { id, ...data };
    try {
        await this.env.DB.prepare("INSERT INTO applicant_documents (id, user_id, doc_type) VALUES (?, ?, ?)")
            .bind(id, data.user_id, data.doc_type)
            .run();
        return ApplicantDocumentSchema.parse(newDoc);
    } catch (error) {
        throw new DatabaseError("Failed to create applicant document", error as Error);
    }
  }

  async getApplicantDocument(id: string): Promise<ApplicantDocument | null> {
    try {
        const result = await this.env.DB.prepare("SELECT * FROM applicant_documents WHERE id = ?").bind(id).first();
        if (!result) {
            throw new NotFoundError("ApplicantDocument", id);
        }
        return ApplicantDocumentSchema.parse(result);
    } catch (error) {
        if (error instanceof NotFoundError) throw error;
        throw new DatabaseError(`Failed to get applicant document with id ${id}`, error as Error);
    }
  }
  
  // ... other methods
}