/**
 * @file src/domains/workflows/workflow-classes/rag-workflow.ts
 * @description RAG Workflow for processing documents and creating embeddings
 */

import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from "cloudflare:workers";
import type { Env } from "../../../config/env";
import { createRAGTool } from "../../../shared/tools";

export interface RAGWorkflowParams {
  text: string;
  documentId?: string;
  metadata?: Record<string, any>;
  enableChunking?: boolean;
}

export class RAGWorkflow extends WorkflowEntrypoint<Env, RAGWorkflowParams> {
  async run(event: WorkflowEvent<RAGWorkflowParams>, step: WorkflowStep) {
    const env = this.env;
    const { text, documentId, metadata, enableChunking = true } = event.payload;

    // Create RAG tool instance
    const ragTool = createRAGTool(env);

    // Generate document ID if not provided
    const docId = documentId || crypto.randomUUID();

    // Process the document
    await step.do("process document", async () => {
      console.log(
        `Processing document ${docId} with ${text.length} characters`
      );

      // Store the document with chunking if enabled
      await ragTool.storeDocument(
        docId,
        text,
        {
          ...metadata,
          processed_at: new Date().toISOString(),
          text_length: text.length,
        },
        enableChunking
      );

      console.log(`Successfully processed document ${docId}`);
      return { documentId: docId, textLength: text.length };
    });

    // Optional: Store in database for reference
    if (env.DB) {
      await step.do("store document reference", async () => {
        try {
          await env.DB.prepare(
            `
            INSERT OR REPLACE INTO documents (id, title, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `
          )
            .bind(
              docId,
              metadata?.title || `Document ${docId}`,
              text,
              new Date().toISOString(),
              new Date().toISOString()
            )
            .run();

          console.log(`Stored document reference in database: ${docId}`);
        } catch (error) {
          console.warn(`Failed to store document reference: ${error}`);
          // Don't fail the workflow if database storage fails
        }
      });
    }

    return {
      success: true,
      documentId: docId,
      textLength: text.length,
      chunked: enableChunking && text.length > 1000,
    };
  }
}

