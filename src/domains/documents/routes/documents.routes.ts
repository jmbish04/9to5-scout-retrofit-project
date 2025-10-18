/**
 * Document Routes
 *
 * RESTful API routes for document management, including CRUD operations,
 * search, generation, and evaluation functionality.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../config/env";
import {
  getValidatedBody,
  getValidatedParams,
  logger,
  rateLimit,
  validateBody,
  validateParams,
} from "../../../core/validation/hono-validation";
import {
  CreateDocumentRequestSchema,
  DocumentGenerationRequestSchema,
  DocumentSearchRequestSchema,
  UpdateDocumentRequestSchema,
} from "../models/document.schema";
import {
  createDocumentGenerationService,
  createDocumentProcessingService,
  createDocumentSearchService,
  createDocumentStorageService,
} from "../services";

const app = new Hono<{ Bindings: Env }>();

// Apply middleware
app.use("*", logger as any);
app.use("*", rateLimit({ requests: 100, windowMs: 60000 }) as any);

/**
 * @route POST /documents
 * @desc Create a new document
 * @access Private
 * @param {CreateDocumentRequest} body - Document creation data
 * @returns {DocumentResponse} Created document details
 */
app.post("/", validateBody(CreateDocumentRequestSchema), async (c) => {
  try {
    const documentData = getValidatedBody(c);
    const storageService = createDocumentStorageService(c.env);
    const document = await storageService.createDocument(documentData);

    return c.json(
      {
        success: true,
        document,
        resume_sections: document.resume_sections || null,
      },
      201
    );
  } catch (error) {
    console.error("Error creating document:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create document",
      },
      500
    );
  }
});

/**
 * @route GET /documents/:id
 * @desc Get a document by ID
 * @access Private
 * @param {string} id - Document ID
 * @returns {DocumentResponse} Document details
 */
app.get(
  "/:id",
  validateParams(z.object({ id: z.coerce.number().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: number };
      const storageService = createDocumentStorageService(c.env);
      const document = await storageService.getDocument(id);

      if (!document) {
        return c.json(
          {
            success: false,
            error: "Document not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        document,
        resume_sections: document.resume_sections || null,
      });
    } catch (error) {
      console.error("Error getting document:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get document",
        },
        500
      );
    }
  }
);

/**
 * @route PUT /documents/:id
 * @desc Update a document
 * @access Private
 * @param {string} id - Document ID
 * @param {UpdateDocumentRequest} body - Document update data
 * @returns {DocumentResponse} Updated document details
 */
app.put(
  "/:id",
  validateParams(z.object({ id: z.coerce.number().min(1) })),
  validateBody(UpdateDocumentRequestSchema),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: number };
      const updateData = getValidatedBody(c);
      const storageService = createDocumentStorageService(c.env);
      const document = await storageService.updateDocument(id, updateData);

      if (!document) {
        return c.json(
          {
            success: false,
            error: "Document not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        document,
        resume_sections: document.resume_sections || null,
      });
    } catch (error) {
      console.error("Error updating document:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update document",
        },
        500
      );
    }
  }
);

/**
 * @route DELETE /documents/:id
 * @desc Delete a document
 * @access Private
 * @param {string} id - Document ID
 * @returns {object} Success message
 */
app.delete(
  "/:id",
  validateParams(z.object({ id: z.coerce.number().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: number };
      const storageService = createDocumentStorageService(c.env);
      await storageService.deleteDocument(id);

      return c.json({
        success: true,
        message: "Document deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete document",
        },
        500
      );
    }
  }
);

/**
 * @route GET /documents
 * @desc List documents for a user
 * @access Private
 * @query {string} user_id - User ID
 * @query {string} doc_type - Document type filter
 * @query {number} limit - Number of documents to return
 * @query {number} offset - Number of documents to skip
 * @returns {DocumentListResponse} List of documents
 */
app.get("/", async (c) => {
  try {
    const userId = c.req.query("user_id");
    const docType = c.req.query("doc_type");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    if (!userId) {
      return c.json(
        {
          success: false,
          error: "user_id query parameter is required",
        },
        400
      );
    }

    const storageService = createDocumentStorageService(c.env);
    const result = await storageService.listDocuments(
      userId,
      docType,
      limit,
      offset
    );

    return c.json({
      success: true,
      documents: result.documents,
      total: result.total,
      page: Math.floor(offset / limit) + 1,
      limit,
    });
  } catch (error) {
    console.error("Error listing documents:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list documents",
      },
      500
    );
  }
});

/**
 * @route POST /documents/search
 * @desc Search documents using vector similarity
 * @access Private
 * @param {DocumentSearchRequest} body - Search parameters
 * @returns {DocumentSearchResponse} Search results
 */
app.post("/search", validateBody(DocumentSearchRequestSchema), async (c) => {
  try {
    const searchParams = getValidatedBody(c);
    const searchService = createDocumentSearchService(c.env);
    const results = await searchService.searchDocuments(searchParams);

    return c.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Error searching documents:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search documents",
      },
      500
    );
  }
});

/**
 * @route POST /documents/generate
 * @desc Generate a new document using AI
 * @access Private
 * @param {DocumentGenerationRequest} body - Generation parameters
 * @returns {DocumentResponse} Generated document
 */
app.post(
  "/generate",
  validateBody(DocumentGenerationRequestSchema),
  async (c) => {
    try {
      const generationParams = getValidatedBody(c);
      const generationService = createDocumentGenerationService(c.env);
      const document = await generationService.generateDocumentForJob(
        generationParams
      );

      return c.json(
        {
          success: true,
          document,
          resume_sections: document.resume_sections || null,
        },
        201
      );
    } catch (error) {
      console.error("Error generating document:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate document",
        },
        500
      );
    }
  }
);

/**
 * @route POST /documents/:id/evaluate
 * @desc Evaluate a document against a job posting
 * @access Private
 * @param {string} id - Document ID
 * @param {object} body - Evaluation parameters
 * @returns {DocumentEvaluationResult} Evaluation results
 */
app.post(
  "/:id/evaluate",
  validateParams(z.object({ id: z.coerce.number().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: number };
      const { job_id } = await c.req.json();

      if (!job_id) {
        return c.json(
          {
            success: false,
            error: "job_id is required",
          },
          400
        );
      }

      const searchService = createDocumentSearchService(c.env);
      const evaluation = await searchService.evaluateDocumentAgainstJob(
        id,
        job_id
      );

      return c.json({
        success: true,
        evaluation,
      });
    } catch (error) {
      console.error("Error evaluating document:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to evaluate document",
        },
        500
      );
    }
  }
);

/**
 * @route POST /documents/:id/patches
 * @desc Apply patches to a document
 * @access Private
 * @param {string} id - Document ID
 * @param {DocumentPatch[]} body - Array of patches to apply
 * @returns {ApplyPatchResult} Patch application result
 */
app.post(
  "/:id/patches",
  validateParams(z.object({ id: z.coerce.number().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: number };
      const { patches } = await c.req.json();

      if (!Array.isArray(patches)) {
        return c.json(
          {
            success: false,
            error: "patches must be an array",
          },
          400
        );
      }

      const processingService = createDocumentProcessingService(c.env);
      const result = await processingService.applyDocumentPatches(id, patches);

      return c.json({
        success: result.success,
        result,
      });
    } catch (error) {
      console.error("Error applying patches:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to apply patches",
        },
        500
      );
    }
  }
);

/**
 * @route GET /documents/:id/status
 * @desc Get document processing status
 * @access Private
 * @param {string} id - Document ID
 * @returns {DocumentProcessingStatus} Processing status
 */
app.get(
  "/:id/status",
  validateParams(z.object({ id: z.coerce.number().min(1) })),
  async (c) => {
    try {
      const { id } = getValidatedParams(c) as { id: number };
      const processingService = createDocumentProcessingService(c.env);
      const status = await processingService.getProcessingStatus(id);

      if (!status) {
        return c.json(
          {
            success: false,
            error: "Processing status not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        status,
      });
    } catch (error) {
      console.error("Error getting processing status:", error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get processing status",
        },
        500
      );
    }
  }
);

/**
 * @route GET /documents/templates
 * @desc Get available document templates
 * @access Private
 * @query {string} doc_type - Document type filter
 * @returns {DocumentTemplate[]} Available templates
 */
app.get("/templates", async (c) => {
  try {
    const docType = c.req.query("doc_type");
    const generationService = createDocumentGenerationService(c.env);
    const templates = await generationService.getDocumentTemplates(docType);

    return c.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Error getting templates:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get templates",
      },
      500
    );
  }
});

/**
 * @route POST /documents/from-template
 * @desc Create a document from a template
 * @access Private
 * @param {object} body - Template creation parameters
 * @returns {DocumentResponse} Created document
 */
app.post("/from-template", async (c) => {
  try {
    const { template_id, user_id, job_id } = await c.req.json();

    if (!template_id || !user_id) {
      return c.json(
        {
          success: false,
          error: "template_id and user_id are required",
        },
        400
      );
    }

    const generationService = createDocumentGenerationService(c.env);
    const document = await generationService.createDocumentFromTemplate(
      template_id,
      user_id,
      job_id
    );

    return c.json(
      {
        success: true,
        document,
        resume_sections: document.resume_sections || null,
      },
      201
    );
  } catch (error) {
    console.error("Error creating document from template:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create document from template",
      },
      500
    );
  }
});

export default app;
