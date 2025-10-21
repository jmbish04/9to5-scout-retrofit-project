/**
 * @module src/new/domains/documents/services/document-processing.service.ts
 * @description
 * This service handles the processing, evaluation, and indexing of applicant documents.
 * It includes logic for ATS evaluation, applying patches, and reindexing documents
 * in the vector store for semantic search.
 */

import { z } from 'zod';
import { getApplicantDocument } from "./document-storage.service"; // Assuming this service exists
import { stripMarkdown } from "../../../lib/vectorize"; // Assuming this utility exists

// ============================================================================ 
// Schemas and Types
// ============================================================================ 

const DocumentPatchSchema = z.object({
  range: z.object({
    start: z.object({ line: z.number(), col: z.number() }),
    end: z.object({ line: z.number(), col: z.number() }),
  }),
  type: z.enum(['insert', 'delete', 'replace']),
  suggestion: z.string(),
});

export type DocumentPatch = z.infer<typeof DocumentPatchSchema>;

export interface ProcessingEnv {
  DB: D1Database;
  AI: Ai;
  VECTORIZE_INDEX: VectorizeIndex;
  R2: R2Bucket;
}

// ============================================================================ 
// Service Class
// ============================================================================ 

export class DocumentProcessingService {
  private env: ProcessingEnv;

  constructor(env: ProcessingEnv) {
    this.env = env;
  }

  /**
   * Generates a text embedding for the given content using a Workers AI model.
   */
  private async embedText(text: string): Promise<number[] | null> {
    try {
      const response = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
      return response.data?.[0] ?? null;
    } catch (error) {
      console.error('Failed to generate text embedding:', error);
      return null;
    }
  }

  /**
   * Re-indexes a document by generating a new embedding for its content and
   * updating the vector index. This is critical for keeping search results fresh.
   *
   * @param documentId - The ID of the document to re-index.
   * @param markdownContent - The full Markdown content of the document.
   * @returns True if reindexing was successful, otherwise false.
   */
  async reindexDocument(documentId: number, markdownContent: string): Promise<boolean> {
    if (!markdownContent) {
      console.warn(`Skipping reindexing for document ${documentId} due to empty content.`);
      return false;
    }

    const embedding = await this.embedText(stripMarkdown(markdownContent));

    if (embedding) {
      try {
        await this.env.VECTORIZE_INDEX.upsert([{ id: documentId.toString(), values: embedding }]);
        console.log(`Successfully reindexed document ${documentId}.`);
        return true;
      } catch (error) {
        console.error(`Failed to upsert new embedding for document ${documentId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Applies a sequence of patches to a document's content, saves the new
   * content, and triggers a re-index of the document.
   *
   * @param id - The ID of the document to patch.
   * @param patches - An array of patches to apply.
   * @returns An object containing the updated document, a summary of changes, and reindexing status.
   */
  async applyDocumentPatches(id: number, patches: DocumentPatch[]): Promise<{
    updated: ApplicantDocumentWithSections; // Assuming this type is defined elsewhere
    diffSummary: string[];
    reindexed: boolean;
  }> {
    const document = await getApplicantDocument(this.env, id);
    if (!document) {
      throw new Error("Document not found");
    }

    const markdown = await this.env.R2.get(document.r2_key_md || "").then((r) => r?.text() ?? "");
    const { text: updatedText, summary } = this.applyPatchSequence(markdown, patches);

    // Save the updated content back to R2
    await this.env.R2.put(document.r2_key_md || "", updatedText);
    await this.env.DB.prepare(
      "UPDATE applicant_documents SET updated_at = ?1 WHERE id = ?2"
    )
      .bind(new Date().toISOString(), id)
      .run();

    /**
     * Reindex the document with updated content to ensure vector embeddings are current.
     * This enables accurate semantic search and similarity matching for the modified document.
     */
    const reindexed = await this.reindexDocument(id, updatedText);

    const updatedDocument = await getApplicantDocument(this.env, id);
    if (!updatedDocument) {
      throw new Error("Failed to reload document after patches");
    }

    return {
      updated: updatedDocument,
      diffSummary: summary,
      reindexed,
    };
  }

  /**
   * Applies patches to a string content. Patches are sorted to prevent conflicts.
   */
  private applyPatchSequence(content: string, patches: DocumentPatch[]): { text: string; summary: string[] } {
    const sorted = [...patches]
      .filter((patch) => patch?.range?.start)
      .sort((a, b) => b.range.start.line - a.range.start.line || b.range.start.col - a.range.start.col);

    let text = content;
    const summary: string[] = [];

    sorted.forEach((patch) => {
      const lines = text.split('\n');
      const { start, end } = patch.range;
      const startLine = lines[start.line - 1];
      const endLine = lines[end.line - 1];

      if (startLine === undefined || endLine === undefined) return;

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
      text = lines.join('\n');
    });

    return { text, summary: summary.reverse() };
  }

  // Other document processing methods like evaluateDocumentAgainstJob would go here...
}
