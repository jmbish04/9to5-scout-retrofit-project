/**
 * Document Storage Service
 *
 * Handles CRUD operations for applicant documents, including database operations,
 * R2 storage management, and document metadata handling.
 */

import type { Env } from "../../../config/env";
import type {
  ApplicantDocument,
  ApplicantDocumentWithSections,
  DocumentCreateInput,
  DocumentUpdateInput,
  ResumeSections,
} from "../types/document.types";

export class DocumentStorageService {
  constructor(private env: Env) {}

  /**
   * Create a new applicant document
   */
  async createDocument(
    input: DocumentCreateInput
  ): Promise<ApplicantDocumentWithSections> {
    const {
      user_id,
      doc_type,
      purpose,
      job_id,
      title,
      content_md,
      editor_json,
      sections,
    } = input;

    // Generate R2 keys
    const timestamp = Date.now();
    const r2KeyMd = `documents/${user_id}/${doc_type}/${timestamp}.md`;
    const r2KeyPdf = `documents/${user_id}/${doc_type}/${timestamp}.pdf`;

    // Store markdown content in R2
    let r2UrlMd: string | null = null;
    if (content_md) {
      await this.env.R2.put(r2KeyMd, content_md, {
        httpMetadata: {
          contentType: "text/markdown",
        },
      });
      r2UrlMd = `https://${this.env.BUCKET_BASE_URL}/${r2KeyMd}`;
    }

    // Store editor JSON in R2
    let editorJsonUrl: string | null = null;
    if (editor_json) {
      const editorJsonKey = `documents/${user_id}/${doc_type}/${timestamp}-editor.json`;
      const editorJsonStr = JSON.stringify(editor_json);
      await this.env.R2.put(editorJsonKey, editorJsonStr, {
        httpMetadata: {
          contentType: "application/json",
        },
      });
      editorJsonUrl = `https://${this.env.BUCKET_BASE_URL}/${editorJsonKey}`;
    }

    // Insert document into database
    const result = await this.env.DB.prepare(
      `
      INSERT INTO applicant_documents (
        user_id, doc_type, purpose, job_id, title, 
        r2_key_md, r2_url_md, r2_key_pdf, r2_url_pdf, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    )
      .bind(
        user_id,
        doc_type,
        purpose || null,
        job_id || null,
        title || null,
        r2KeyMd,
        r2UrlMd,
        r2KeyPdf,
        null // PDF URL will be set later
      )
      .run();

    const documentId = result.meta.last_row_id as number;

    // Insert resume sections if provided
    if (sections && doc_type === "resume") {
      await this.insertResumeSections(documentId, sections);
    }

    // Return the created document
    const createdDocument = await this.getDocument(documentId);
    if (!createdDocument) {
      throw new Error("Failed to retrieve created document");
    }
    return createdDocument;
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: number): Promise<ApplicantDocumentWithSections | null> {
    const document = (await this.env.DB.prepare(
      `
      SELECT * FROM applicant_documents WHERE id = ?
    `
    )
      .bind(id)
      .first()) as ApplicantDocument | null;

    if (!document) {
      return null;
    }

    // Get resume sections if it's a resume
    let resumeSections: ResumeSections | null = null;
    if (document.doc_type === "resume") {
      const sections = (await this.env.DB.prepare(
        `
        SELECT * FROM resume_sections WHERE document_id = ?
      `
      )
        .bind(id)
        .first()) as ResumeSections | null;
      resumeSections = sections || null;
    }

    return {
      ...document,
      resume_sections: resumeSections,
      editor_json_url: null, // Will be populated if needed
    };
  }

  /**
   * Update an existing document
   */
  async updateDocument(
    id: number,
    input: DocumentUpdateInput
  ): Promise<ApplicantDocumentWithSections | null> {
    const { title, content_md, editor_json, sections, purpose, job_id } = input;

    // Get existing document
    const existing = await this.getDocument(id);
    if (!existing) {
      return null;
    }

    // Update R2 content if provided
    if (content_md && existing.r2_key_md) {
      await this.env.R2.put(existing.r2_key_md, content_md, {
        httpMetadata: {
          contentType: "text/markdown",
        },
      });
    }

    // Update editor JSON if provided
    if (editor_json && existing.r2_key_md) {
      const editorJsonKey = existing.r2_key_md.replace(".md", "-editor.json");
      const editorJsonStr = JSON.stringify(editor_json);
      await this.env.R2.put(editorJsonKey, editorJsonStr, {
        httpMetadata: {
          contentType: "application/json",
        },
      });
    }

    // Update database
    await this.env.DB.prepare(
      `
      UPDATE applicant_documents 
      SET title = COALESCE(?, title),
          purpose = COALESCE(?, purpose),
          job_id = COALESCE(?, job_id),
          updated_at = datetime('now')
      WHERE id = ?
    `
    )
      .bind(
        title !== undefined ? title : null,
        purpose !== undefined ? purpose : null,
        job_id !== undefined ? job_id : null,
        id
      )
      .run();

    // Update resume sections if provided
    if (sections && existing.doc_type === "resume") {
      await this.updateResumeSections(id, sections);
    }

    return this.getDocument(id);
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: number): Promise<void> {
    const document = await this.getDocument(id);
    if (!document) {
      return;
    }

    // Delete from R2
    if (document.r2_key_md) {
      await this.env.R2.delete(document.r2_key_md);
    }
    if (document.r2_key_pdf) {
      await this.env.R2.delete(document.r2_key_pdf);
    }

    // Delete resume sections
    if (document.doc_type === "resume") {
      await this.env.DB.prepare(
        `
        DELETE FROM resume_sections WHERE document_id = ?
      `
      )
        .bind(id)
        .run();
    }

    // Delete from database
    await this.env.DB.prepare(
      `
      DELETE FROM applicant_documents WHERE id = ?
    `
    )
      .bind(id)
      .run();
  }

  /**
   * List documents for a user
   */
  async listDocuments(
    userId: string,
    docType?: string,
    limit = 50,
    offset = 0
  ): Promise<{ documents: ApplicantDocumentWithSections[]; total: number }> {
    let whereClause = "WHERE user_id = ?";
    const params: any[] = [userId];

    if (docType) {
      whereClause += " AND doc_type = ?";
      params.push(docType);
    }

    // Get total count
    const countResult = (await this.env.DB.prepare(
      `
      SELECT COUNT(*) as total FROM applicant_documents ${whereClause}
    `
    )
      .bind(...params)
      .first()) as { total: number } | null;

    // Get documents
    const documents = (await this.env.DB.prepare(
      `
      SELECT * FROM applicant_documents 
      ${whereClause}
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `
    )
      .bind(...params, limit, offset)
      .all()) as ApplicantDocument[];

    // Get resume sections for each resume document
    const documentsWithSections: ApplicantDocumentWithSections[] = [];
    for (const doc of documents) {
      let resumeSections: ResumeSections | null = null;
      if (doc.doc_type === "resume") {
        const sections = (await this.env.DB.prepare(
          `
          SELECT * FROM resume_sections WHERE document_id = ?
        `
        )
          .bind(doc.id)
          .first()) as ResumeSections | null;
        resumeSections = sections || null;
      }

      documentsWithSections.push({
        ...doc,
        resume_sections: resumeSections,
        editor_json_url: null,
      });
    }

    return {
      documents: documentsWithSections,
      total: countResult?.total || 0,
    };
  }

  /**
   * Insert resume sections
   */
  private async insertResumeSections(
    documentId: number,
    sections: ResumeSections
  ): Promise<void> {
    const {
      summary,
      contact,
      skills,
      experience,
      education,
      projects,
      certifications,
      extras,
    } = sections;

    await this.env.DB.prepare(
      `
      INSERT INTO resume_sections (
        document_id, summary, contact, skills, experience, 
        education, projects, certifications, extras
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        documentId,
        summary || null,
        contact || null,
        skills || null,
        experience || null,
        education || null,
        projects || null,
        certifications || null,
        extras || null
      )
      .run();
  }

  /**
   * Update resume sections
   */
  private async updateResumeSections(
    documentId: number,
    sections: ResumeSections
  ): Promise<void> {
    const {
      summary,
      contact,
      skills,
      experience,
      education,
      projects,
      certifications,
      extras,
    } = sections;

    await this.env.DB.prepare(
      `
      UPDATE resume_sections 
      SET summary = ?, contact = ?, skills = ?, experience = ?, 
          education = ?, projects = ?, certifications = ?, extras = ?
      WHERE document_id = ?
    `
    )
      .bind(
        summary || null,
        contact || null,
        skills || null,
        experience || null,
        education || null,
        projects || null,
        certifications || null,
        extras || null,
        documentId
      )
      .run();
  }
}

/**
 * Create a document storage service instance
 */
export function createDocumentStorageService(env: Env): DocumentStorageService {
  return new DocumentStorageService(env);
}
