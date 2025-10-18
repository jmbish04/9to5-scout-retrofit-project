/**
 * Document Processing Service
 *
 * Handles document processing operations including patches, serialization,
 * and various utility functions for document manipulation.
 */

import type { Env } from "../../../config/env";
import type {
  DocumentPatch,
  DocumentProcessingStatus,
  ResumeSections,
} from "../types/document.types";

export interface ApplyPatchResult {
  success: boolean;
  updatedDocument?: any;
  error?: string;
}

export class DocumentProcessingService {
  constructor(private env: Env) {}

  /**
   * Apply patches to a document
   */
  async applyDocumentPatches(
    documentId: number,
    patches: DocumentPatch[]
  ): Promise<ApplyPatchResult> {
    try {
      // Get the current document
      const { createDocumentStorageService } = await import(
        "./document-storage.service"
      );
      const storageService = createDocumentStorageService(this.env);
      const document = await storageService.getDocument(documentId);

      if (!document) {
        return {
          success: false,
          error: "Document not found",
        };
      }

      // Apply patches sequentially
      let updatedDocument = { ...document };

      for (const patch of patches) {
        updatedDocument = this.applyPatch(updatedDocument, patch);
      }

      // Update the document in storage
      const updated = await storageService.updateDocument(documentId, {
        title: updatedDocument.title,
        content_md: (updatedDocument as any).content_md,
        sections: updatedDocument.resume_sections,
      });

      return {
        success: true,
        updatedDocument: updated,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Apply a single patch to a document
   */
  private applyPatch(document: any, patch: DocumentPatch): any {
    const { op, path, value } = patch;
    const pathParts = path.split("/").filter((part) => part !== "");

    if (pathParts.length === 0) {
      return document;
    }

    switch (op) {
      case "replace":
        return this.replaceValue(document, pathParts, value);
      case "add":
        return this.addValue(document, pathParts, value);
      case "remove":
        return this.removeValue(document, pathParts);
      default:
        throw new Error(`Unsupported patch operation: ${op}`);
    }
  }

  /**
   * Replace a value at the specified path
   */
  private replaceValue(obj: any, pathParts: string[], value: any): any {
    if (pathParts.length === 0) {
      return value;
    }

    const [first, ...rest] = pathParts;
    if (!first) {
      return obj;
    }

    const result = { ...obj };

    if (pathParts.length === 1) {
      result[first] = value;
    } else {
      result[first] = this.replaceValue(obj[first] || {}, rest, value);
    }

    return result;
  }

  /**
   * Add a value at the specified path
   */
  private addValue(obj: any, pathParts: string[], value: any): any {
    if (pathParts.length === 0) {
      return value;
    }

    const [first, ...rest] = pathParts;
    if (!first) {
      return obj;
    }

    const result = { ...obj };

    if (pathParts.length === 1) {
      if (Array.isArray(result[first])) {
        result[first] = [...result[first], value];
      } else {
        result[first] = value;
      }
    } else {
      result[first] = this.addValue(obj[first] || {}, rest, value);
    }

    return result;
  }

  /**
   * Remove a value at the specified path
   */
  private removeValue(obj: any, pathParts: string[]): any {
    if (pathParts.length === 0) {
      return undefined;
    }

    const [first, ...rest] = pathParts;
    if (!first) {
      return obj;
    }

    const result = { ...obj };

    if (pathParts.length === 1) {
      delete result[first];
    } else {
      result[first] = this.removeValue(obj[first] || {}, rest);
    }

    return result;
  }

  /**
   * Serialize editor JSON to string
   */
  serializeEditorJson(editor: unknown): string {
    try {
      return JSON.stringify(editor, null, 2);
    } catch (error) {
      console.error("Error serializing editor JSON:", error);
      return "{}";
    }
  }

  /**
   * Build resume section insert statement
   */
  buildResumeSectionInsert(
    documentId: number,
    sections?: ResumeSections | null
  ) {
    if (!sections) {
      return null;
    }

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

    return {
      document_id: documentId,
      summary: summary || null,
      contact: contact || null,
      skills: skills || null,
      experience: experience || null,
      education: education || null,
      projects: projects || null,
      certifications: certifications || null,
      extras: extras || null,
    };
  }

  /**
   * Get document processing status
   */
  async getProcessingStatus(
    documentId: number
  ): Promise<DocumentProcessingStatus | null> {
    const status = (await this.env.DB.prepare(
      `
      SELECT * FROM document_processing_status WHERE document_id = ?
    `
    )
      .bind(documentId)
      .first()) as DocumentProcessingStatus | null;

    return status || null;
  }

  /**
   * Update document processing status
   */
  async updateProcessingStatus(
    documentId: number,
    status: DocumentProcessingStatus
  ): Promise<void> {
    await this.env.DB.prepare(
      `
      INSERT OR REPLACE INTO document_processing_status (
        document_id, status, progress, current_step, error_message, 
        started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        documentId,
        status.status,
        status.progress,
        status.current_step || null,
        status.error_message || null,
        status.started_at || null,
        status.completed_at || null
      )
      .run();
  }

  /**
   * Start document processing
   */
  async startProcessing(
    documentId: number,
    currentStep?: string
  ): Promise<void> {
    await this.updateProcessingStatus(documentId, {
      document_id: documentId,
      status: "processing",
      progress: 0,
      current_step: currentStep || "Starting processing",
      started_at: new Date().toISOString(),
    });
  }

  /**
   * Complete document processing
   */
  async completeProcessing(documentId: number): Promise<void> {
    await this.updateProcessingStatus(documentId, {
      document_id: documentId,
      status: "completed",
      progress: 100,
      current_step: "Processing completed",
      completed_at: new Date().toISOString(),
    });
  }

  /**
   * Fail document processing
   */
  async failProcessing(
    documentId: number,
    errorMessage: string
  ): Promise<void> {
    await this.updateProcessingStatus(documentId, {
      document_id: documentId,
      status: "failed",
      progress: 0,
      current_step: "Processing failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    });
  }

  /**
   * Update processing progress
   */
  async updateProgress(
    documentId: number,
    progress: number,
    currentStep?: string
  ): Promise<void> {
    await this.updateProcessingStatus(documentId, {
      document_id: documentId,
      status: "processing",
      progress: Math.max(0, Math.min(100, progress)),
      current_step: currentStep || "Processing",
    });
  }

  /**
   * Clean up old processing status records
   */
  async cleanupOldStatuses(daysOld = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.env.DB.prepare(
      `
      DELETE FROM document_processing_status 
      WHERE completed_at IS NOT NULL 
      AND completed_at < ?
    `
    )
      .bind(cutoffDate.toISOString())
      .run();
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const stats = (await this.env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM document_processing_status
    `
    ).first()) as {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    } | null;

    return (
      stats || {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      }
    );
  }
}

/**
 * Create a document processing service instance
 */
export function createDocumentProcessingService(
  env: Env
): DocumentProcessingService {
  return new DocumentProcessingService(env);
}
