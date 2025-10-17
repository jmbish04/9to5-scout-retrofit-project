/**
 * File Management Routes
 *
 * Handles file upload, download, and management operations using the centralized R2 module.
 */
import { createFileMetadata, createR2Storage } from "../lib/r2";
/**
 * Handle file upload requests
 */
export async function handleFileUpload(request, env) {
    try {
        const url = new URL(request.url);
        const fileType = url.searchParams.get("type");
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
        return new Response(JSON.stringify({
            success: true,
            file: result,
        }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("File upload error:", error);
        return new Response(JSON.stringify({ error: "Failed to upload file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
/**
 * Handle file download requests
 */
export async function handleFileDownload(request, env) {
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
            headers.set("Content-Disposition", `attachment; filename="${file.customMetadata.originalName}"`);
        }
        // Check if the object has a body (R2ObjectBody) or is just metadata (R2Object)
        if ("body" in file && file.body) {
            return new Response(file.body, { headers });
        }
        else {
            return new Response(JSON.stringify({ error: "File body not available" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }
    catch (error) {
        console.error("File download error:", error);
        return new Response(JSON.stringify({ error: "Failed to download file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
/**
 * Handle file listing requests
 */
export async function handleFileList(request, env) {
    try {
        const url = new URL(request.url);
        const type = url.searchParams.get("type");
        const userId = url.searchParams.get("userId");
        const limit = parseInt(url.searchParams.get("limit") || "100", 10);
        const r2Storage = createR2Storage(env);
        const files = await r2Storage.listFiles(type, userId || undefined, limit);
        return new Response(JSON.stringify({
            success: true,
            files,
            count: files.length,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("File list error:", error);
        return new Response(JSON.stringify({ error: "Failed to list files" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
/**
 * Handle file deletion requests
 */
export async function handleFileDelete(request, env) {
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
        return new Response(JSON.stringify({
            success: true,
            message: "File deleted successfully",
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("File deletion error:", error);
        return new Response(JSON.stringify({ error: "Failed to delete file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
/**
 * Handle bulk file deletion requests
 */
export async function handleBulkFileDelete(request, env) {
    try {
        const body = (await request.json());
        const { type, userId, olderThan } = body;
        const r2Storage = createR2Storage(env);
        const deletedCount = await r2Storage.deleteFiles(type, userId, olderThan ? new Date(olderThan) : undefined);
        return new Response(JSON.stringify({
            success: true,
            deletedCount,
            message: `Deleted ${deletedCount} files`,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Bulk file deletion error:", error);
        return new Response(JSON.stringify({ error: "Failed to delete files" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
/**
 * Handle storage statistics requests
 */
export async function handleStorageStats(request, env) {
    try {
        const r2Storage = createR2Storage(env);
        const stats = await r2Storage.getStorageStats();
        return new Response(JSON.stringify({
            success: true,
            stats,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Storage stats error:", error);
        return new Response(JSON.stringify({ error: "Failed to get storage statistics" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
/**
 * Handle file metadata requests
 */
export async function handleFileMetadata(request, env) {
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
        return new Response(JSON.stringify({
            success: true,
            metadata: {
                key: metadata.key,
                size: metadata.size,
                uploadedAt: metadata.uploaded.toISOString(),
                contentType: metadata.httpMetadata?.contentType,
                customMetadata: metadata.customMetadata,
            },
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("File metadata error:", error);
        return new Response(JSON.stringify({ error: "Failed to get file metadata" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
/**
 * Handle R2 asset upload requests for browser rendering tests
 * This endpoint allows uploading files directly to R2 with authentication
 */
export async function handleR2AssetUpload(request, env) {
    try {
        // Check authentication
        const authHeader = request.headers.get("Authorization");
        const expectedAuth = `Bearer ${env.WORKER_API_KEY}`;
        if (!authHeader || authHeader !== expectedAuth) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }
        const url = new URL(request.url);
        const r2Key = url.searchParams.get("key");
        const contentType = request.headers.get("Content-Type") || "application/octet-stream";
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
        return new Response(JSON.stringify({
            success: true,
            key: r2Key,
            size: fileData.byteLength,
            message: "File uploaded to R2 successfully",
        }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("R2 asset upload error:", error);
        return new Response(JSON.stringify({ error: "Failed to upload file to R2" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
