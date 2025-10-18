/**
 * UI Files Routes
 *
 * Handles file upload, download, and management operations using the centralized R2 module.
 * Provides comprehensive file management capabilities for the 9to5 Scout application.
 *
 * @fileoverview This module manages file operations including upload, download, listing,
 * deletion, and metadata retrieval for various file types stored in R2 storage.
 */

import {
  FileType,
  createFileMetadata,
  createR2Storage,
} from "../../../core/storage/r2-client";
import type { Env } from "../../config/env";

/**
 * Handles file upload requests with metadata tracking
 *
 * @param request - The incoming HTTP request containing file data
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with upload result or error details
 *
 * @description This function:
 * 1. Extracts file type, user ID, job ID, and site ID from query parameters
 * 2. Validates required file type parameter
 * 3. Creates file metadata with contextual information
 * 4. Uploads file to R2 storage with proper metadata
 * 5. Returns success response with file details
 *
 * @example
 * ```typescript
 * // POST /files/upload?type=resume&userId=user123&jobId=job456
 * // Content-Type: multipart/form-data
 * // Body: file data
 * ```
 */
export async function handleFileUpload(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const fileType = url.searchParams.get("type") as FileType;
    const userId = url.searchParams.get("userId") || "system";
    const jobId = url.searchParams.get("jobId");
    const siteId = url.searchParams.get("siteId");

    if (!fileType) {
      return new Response(JSON.stringify({ error: "File type is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const r2Storage = createR2Storage(env);
    const metadata = createFileMetadata(fileType, request, {
      userId,
      jobId: jobId || undefined,
      siteId: siteId || undefined,
    });

    const file = await request.arrayBuffer();
    const result = await r2Storage.uploadFile(file, metadata);

    return new Response(
      JSON.stringify({
        success: true,
        file: result,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("File upload error:", error);
    return new Response(JSON.stringify({ error: "Failed to upload file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Handles file download requests with proper headers
 *
 * @param request - The incoming HTTP request with file key parameter
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with file content or error details
 *
 * @description This function:
 * 1. Extracts file key from query parameters
 * 2. Validates required key parameter
 * 3. Retrieves file from R2 storage
 * 4. Sets appropriate content type and disposition headers
 * 5. Returns file content or 404 if not found
 *
 * @example
 * ```typescript
 * // GET /files/download?key=resumes/user123/resume.pdf
 * // Returns: file content with proper headers
 * ```
 */
export async function handleFileDownload(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return new Response(JSON.stringify({ error: "File key is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const r2Storage = createR2Storage(env);
    const file = await r2Storage.getFile(key);

    if (!file) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const headers = new Headers();
    if (file.httpMetadata?.contentType) {
      headers.set("Content-Type", file.httpMetadata.contentType);
    }
    if (file.customMetadata?.originalName) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${file.customMetadata.originalName}"`
      );
    }

    // Check if the object has a body (R2ObjectBody) or is just metadata (R2Object)
    if ("body" in file && file.body) {
      return new Response(file.body as BodyInit, { headers });
    } else {
      return new Response(
        JSON.stringify({ error: "File body not available" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("File download error:", error);
    return new Response(JSON.stringify({ error: "Failed to download file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Handles file listing requests with filtering options
 *
 * @param request - The incoming HTTP request with optional filter parameters
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with file list or error details
 *
 * @description This function:
 * 1. Extracts filter parameters (type, userId, limit) from query string
 * 2. Calls R2 storage to list files with applied filters
 * 3. Returns paginated list of files with metadata
 *
 * @example
 * ```typescript
 * // GET /files/list?type=resume&userId=user123&limit=50
 * // Returns: { success: true, files: [...], count: 25 }
 * ```
 */
export async function handleFileList(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") as FileType | undefined;
    const userId = url.searchParams.get("userId");
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    const r2Storage = createR2Storage(env);
    const files = await r2Storage.listFiles(type, userId || undefined, limit);

    return new Response(
      JSON.stringify({
        success: true,
        files,
        count: files.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("File list error:", error);
    return new Response(JSON.stringify({ error: "Failed to list files" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Handles file deletion requests
 *
 * @param request - The incoming HTTP request with file key parameter
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with deletion result or error details
 *
 * @description This function:
 * 1. Extracts file key from query parameters
 * 2. Validates required key parameter
 * 3. Deletes file from R2 storage
 * 4. Returns success confirmation
 *
 * @example
 * ```typescript
 * // DELETE /files/delete?key=resumes/user123/resume.pdf
 * // Returns: { success: true, message: "File deleted successfully" }
 * ```
 */
export async function handleFileDelete(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return new Response(JSON.stringify({ error: "File key is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const r2Storage = createR2Storage(env);
    await r2Storage.deleteFile(key);

    return new Response(
      JSON.stringify({
        success: true,
        message: "File deleted successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("File deletion error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Handles bulk file deletion requests with filtering criteria
 *
 * @param request - The incoming HTTP request with deletion criteria in body
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with deletion count and result
 *
 * @description This function:
 * 1. Extracts deletion criteria from request body (type, userId, olderThan)
 * 2. Calls R2 storage to delete files matching criteria
 * 3. Returns count of deleted files
 *
 * @example
 * ```typescript
 * // POST /files/bulk-delete
 * // Body: { type: "resume", userId: "user123", olderThan: "2024-01-01" }
 * // Returns: { success: true, deletedCount: 15, message: "Deleted 15 files" }
 * ```
 */
export async function handleBulkFileDelete(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as {
      type?: FileType;
      userId?: string;
      olderThan?: string;
    };
    const { type, userId, olderThan } = body;

    const r2Storage = createR2Storage(env);
    const deletedCount = await r2Storage.deleteFiles(
      type,
      userId,
      olderThan ? new Date(olderThan) : undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} files`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Bulk file deletion error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete files" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Handles storage statistics requests
 *
 * @param request - The incoming HTTP request
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with storage statistics or error details
 *
 * @description This function:
 * 1. Calls R2 storage to get comprehensive statistics
 * 2. Returns storage usage, file counts, and other metrics
 *
 * @example
 * ```typescript
 * // GET /files/stats
 * // Returns: { success: true, stats: { totalFiles: 1000, totalSize: "500MB", ... } }
 * ```
 */
export async function handleStorageStats(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const r2Storage = createR2Storage(env);
    const stats = await r2Storage.getStorageStats();

    return new Response(
      JSON.stringify({
        success: true,
        stats,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Storage stats error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get storage statistics" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handles file metadata requests
 *
 * @param request - The incoming HTTP request with file key parameter
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with file metadata or error details
 *
 * @description This function:
 * 1. Extracts file key from query parameters
 * 2. Validates required key parameter
 * 3. Retrieves file metadata from R2 storage
 * 4. Returns formatted metadata information
 *
 * @example
 * ```typescript
 * // GET /files/metadata?key=resumes/user123/resume.pdf
 * // Returns: { success: true, metadata: { key, size, uploadedAt, contentType, ... } }
 * ```
 */
export async function handleFileMetadata(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return new Response(JSON.stringify({ error: "File key is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const r2Storage = createR2Storage(env);
    const metadata = await r2Storage.getFileMetadata(key);

    if (!metadata) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        metadata: {
          key: metadata.key,
          size: metadata.size,
          uploadedAt: metadata.uploaded.toISOString(),
          contentType: metadata.httpMetadata?.contentType,
          customMetadata: metadata.customMetadata,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("File metadata error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get file metadata" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handles R2 asset upload requests for browser rendering tests
 *
 * @param request - The incoming HTTP request with file data and authentication
 * @param env - Cloudflare Workers environment bindings
 * @returns Response with upload result or error details
 *
 * @description This function:
 * 1. Validates API key authentication
 * 2. Extracts R2 key and content type from request
 * 3. Uploads file directly to R2 bucket with metadata
 * 4. Returns upload confirmation with file details
 *
 * @example
 * ```typescript
 * // POST /files/r2-upload?key=test/file.pdf
 * // Headers: { Authorization: "Bearer <API_KEY>", Content-Type: "application/pdf" }
 * // Body: file data
 * // Returns: { success: true, key: "test/file.pdf", size: 1024, ... }
 * ```
 */
export async function handleR2AssetUpload(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Check authentication
    const authHeader = request.headers.get("Authorization");
    const expectedAuth = `Bearer ${env.API_AUTH_TOKEN}`;

    if (!authHeader || authHeader !== expectedAuth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);
    const r2Key = url.searchParams.get("key");
    const contentType =
      request.headers.get("Content-Type") || "application/octet-stream";

    if (!r2Key) {
      return new Response(JSON.stringify({ error: "R2 key is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Upload directly to R2 bucket
    const fileData = await request.arrayBuffer();
    await env.R2.put(r2Key, fileData, {
      httpMetadata: {
        contentType: contentType,
      },
      customMetadata: {
        uploadedBy: "browser-rendering-test",
        uploadedAt: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        key: r2Key,
        size: fileData.byteLength,
        message: "File uploaded to R2 successfully",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("R2 asset upload error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to upload file to R2" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
