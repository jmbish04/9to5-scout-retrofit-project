/**
 * Centralized R2 Storage Module
 *
 * Provides a unified interface for file operations across different file types
 * with organized file paths and URL generation using BUCKET_BASE_URL.
 */
export class R2Storage {
    r2;
    bucketBaseUrl;
    constructor(r2, bucketBaseUrl) {
        this.r2 = r2;
        this.bucketBaseUrl = bucketBaseUrl;
    }
    /**
     * Generate file path based on file type and metadata
     */
    generateFilePath(type, metadata) {
        const timestamp = metadata.timestamp || new Date().toISOString().split("T")[0];
        const userId = metadata.userId || "system";
        switch (type) {
            case "resume":
                return `resumes/${userId}/${timestamp}/${metadata.originalName || "resume.pdf"}`;
            case "cover-letter":
                return `cover-letters/${userId}/${timestamp}/${metadata.originalName || "cover-letter.pdf"}`;
            case "job-posting":
                const siteId = metadata.siteId || "unknown";
                const jobId = metadata.jobId || "unknown";
                return `job-postings/${siteId}/${jobId}/${timestamp}.html`;
            case "scraped-content":
                const scrapedSiteId = metadata.siteId || "unknown";
                const scrapedTimestamp = metadata.timestamp || new Date().toISOString();
                return `scraped-content/${scrapedSiteId}/${scrapedTimestamp.replace(/[:.]/g, "-")}.html`;
            case "email-template":
                return `email-templates/${userId}/${metadata.originalName || "template.html"}`;
            case "report":
                return `reports/${userId}/${timestamp}/${metadata.originalName || "report.json"}`;
            case "backup":
                return `backups/${type}/${timestamp}/${metadata.originalName || "backup.json"}`;
            case "temp":
                return `temp/${userId}/${timestamp}/${metadata.originalName || "temp-file"}`;
            default:
                return `misc/${userId}/${timestamp}/${metadata.originalName || "file"}`;
        }
    }
    /**
     * Generate public URL for a file
     */
    generateUrl(key) {
        return `${this.bucketBaseUrl}/${key}`;
    }
    /**
     * Upload a file to R2
     */
    async uploadFile(file, metadata) {
        const key = this.generateFilePath(metadata.type, metadata);
        const url = this.generateUrl(key);
        // Convert file to ArrayBuffer if needed
        let fileData;
        if (file instanceof File) {
            fileData = await file.arrayBuffer();
        }
        else if (typeof file === "string") {
            fileData = new TextEncoder().encode(file).buffer;
        }
        else {
            fileData = file;
        }
        // Upload to R2
        await this.r2.put(key, fileData, {
            httpMetadata: {
                contentType: metadata.contentType || "application/octet-stream",
            },
            customMetadata: {
                type: metadata.type,
                userId: metadata.userId || "system",
                jobId: metadata.jobId || "",
                siteId: metadata.siteId || "",
                originalName: metadata.originalName || "",
                uploadedAt: new Date().toISOString(),
            },
        });
        return {
            key,
            url,
            size: fileData.byteLength,
            uploadedAt: new Date().toISOString(),
            metadata,
        };
    }
    /**
     * Get a file from R2
     */
    async getFile(key) {
        return await this.r2.get(key);
    }
    /**
     * Get file metadata without downloading the file
     */
    async getFileMetadata(key) {
        return await this.r2.head(key);
    }
    /**
     * List files by type and optional filters
     */
    async listFiles(type, userId, limit = 100) {
        const prefix = type ? `${type}s/` : "";
        const userPrefix = userId ? `${prefix}${userId}/` : prefix;
        const objects = await this.r2.list({
            prefix: userPrefix,
            limit,
        });
        return objects.objects.map((obj) => ({
            key: obj.key,
            url: this.generateUrl(obj.key),
            size: obj.size,
            uploadedAt: obj.uploaded.toISOString(),
            metadata: {
                type: obj.customMetadata?.type || "misc",
                userId: obj.customMetadata?.userId || "system",
                jobId: obj.customMetadata?.jobId,
                siteId: obj.customMetadata?.siteId,
                originalName: obj.customMetadata?.originalName,
                contentType: obj.httpMetadata?.contentType,
            },
        }));
    }
    /**
     * Delete a file from R2
     */
    async deleteFile(key) {
        await this.r2.delete(key);
    }
    /**
     * Delete multiple files by type and filters
     */
    async deleteFiles(type, userId, olderThan) {
        const files = await this.listFiles(type, userId, 1000);
        let deletedCount = 0;
        for (const file of files) {
            if (olderThan && new Date(file.uploadedAt) > olderThan) {
                continue;
            }
            await this.deleteFile(file.key);
            deletedCount++;
        }
        return deletedCount;
    }
    /**
     * Generate a presigned URL for temporary access
     */
    async generatePresignedUrl(key, expiresIn = 3600) {
        // Note: R2 doesn't support presigned URLs directly
        // This would need to be implemented via a custom endpoint
        // For now, return the public URL
        return this.generateUrl(key);
    }
    /**
     * Get storage usage statistics
     */
    async getStorageStats() {
        const allFiles = await this.listFiles(undefined, undefined, 1000);
        const stats = {
            totalFiles: allFiles.length,
            totalSize: allFiles.reduce((sum, file) => sum + file.size, 0),
            byType: {},
        };
        // Initialize all file types
        const fileTypes = [
            "resume",
            "cover-letter",
            "job-posting",
            "scraped-content",
            "email-template",
            "report",
            "backup",
            "temp",
        ];
        fileTypes.forEach((type) => {
            stats.byType[type] = { count: 0, size: 0 };
        });
        // Aggregate by type
        allFiles.forEach((file) => {
            const type = file.metadata.type;
            if (stats.byType[type]) {
                stats.byType[type].count++;
                stats.byType[type].size += file.size;
            }
        });
        return stats;
    }
}
/**
 * Factory function to create R2Storage instance
 */
export function createR2Storage(env) {
    return new R2Storage(env.R2, env.BUCKET_BASE_URL);
}
/**
 * Helper function to extract file type from content type
 */
export function getFileTypeFromContentType(contentType) {
    if (contentType.includes("pdf"))
        return "resume";
    if (contentType.includes("html"))
        return "scraped-content";
    if (contentType.includes("json"))
        return "report";
    if (contentType.includes("text"))
        return "email-template";
    return "misc";
}
/**
 * Helper function to generate file metadata from request
 */
export function createFileMetadata(type, request, additionalData = {}) {
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const originalName = request.headers.get("x-original-filename") || "unknown";
    return {
        type,
        contentType,
        originalName,
        timestamp: new Date().toISOString(),
        ...additionalData,
    };
}
