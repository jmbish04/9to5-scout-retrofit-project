/**
 * Centralized R2 Storage Module
 *
 * Provides a unified interface for file operations across different file types
 * with organized file paths and URL generation using BUCKET_BASE_URL.
 */

export type FileType =
  | "resume"
  | "cover-letter"
  | "job-posting"
  | "scraped-content"
  | "email-template"
  | "report"
  | "backup"
  | "temp"
  | "misc";

export interface FileMetadata {
  type: FileType;
  userId?: string;
  jobId?: string;
  siteId?: string;
  timestamp?: string;
  originalName?: string;
  contentType?: string;
}

export interface R2File {
  key: string;
  url: string;
  size: number;
  uploadedAt: string;
  metadata: FileMetadata;
}

export class R2Storage {
  constructor(private r2: R2Bucket, private bucketBaseUrl: string) {}

  /**
   * Generate file path based on file type and metadata
   */
  private generateFilePath(type: FileType, metadata: FileMetadata): string {
    const timestamp =
      metadata.timestamp || new Date().toISOString().split("T")[0];
    const userId = metadata.userId || "system";

    switch (type) {
      case "resume":
        return `resumes/${userId}/${timestamp}/${
          metadata.originalName || "resume.pdf"
        }`;

      case "cover-letter":
        return `cover-letters/${userId}/${timestamp}/${
          metadata.originalName || "cover-letter.pdf"
        }`;

      case "job-posting":
        const siteId = metadata.siteId || "unknown";
        const jobId = metadata.jobId || "unknown";
        return `job-postings/${siteId}/${jobId}/${timestamp}.html`;

      case "scraped-content":
        const scrapedSiteId = metadata.siteId || "unknown";
        const scrapedTimestamp = metadata.timestamp || new Date().toISOString();
        return `scraped-content/${scrapedSiteId}/${scrapedTimestamp.replace(
          /[:.]/g,
          "-"
        )}.html`;

      case "email-template":
        return `email-templates/${userId}/${
          metadata.originalName || "template.html"
        }`;

      case "report":
        return `reports/${userId}/${timestamp}/${
          metadata.originalName || "report.json"
        }`;

      case "backup":
        return `backups/${type}/${timestamp}/${
          metadata.originalName || "backup.json"
        }`;

      case "temp":
        return `temp/${userId}/${timestamp}/${
          metadata.originalName || "temp-file"
        }`;

      default:
        return `misc/${userId}/${timestamp}/${metadata.originalName || "file"}`;
    }
  }

  /**
   * Generate public URL for a file
   */
  private generateUrl(key: string): string {
    return `${this.bucketBaseUrl}/${key}`;
  }

  /**
   * Upload a file to R2
   */
  async uploadFile(
    file: File | ArrayBuffer | string,
    metadata: FileMetadata
  ): Promise<R2File> {
    const key = this.generateFilePath(metadata.type, metadata);
    const url = this.generateUrl(key);

    // Convert file to ArrayBuffer if needed
    let fileData: ArrayBuffer;
    if (file instanceof File) {
      fileData = await file.arrayBuffer();
    } else if (typeof file === "string") {
      fileData = new TextEncoder().encode(file).buffer as ArrayBuffer;
    } else {
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
  async getFile(key: string): Promise<R2Object | null> {
    return await this.r2.get(key);
  }

  /**
   * Get file metadata without downloading the file
   */
  async getFileMetadata(key: string): Promise<R2Object | null> {
    return await this.r2.head(key);
  }

  /**
   * List files by type and optional filters
   */
  async listFiles(
    type?: FileType,
    userId?: string,
    limit: number = 100
  ): Promise<R2File[]> {
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
        type: (obj.customMetadata?.type as FileType) || "misc",
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
  async deleteFile(key: string): Promise<void> {
    await this.r2.delete(key);
  }

  /**
   * Delete multiple files by type and filters
   */
  async deleteFiles(
    type?: FileType,
    userId?: string,
    olderThan?: Date
  ): Promise<number> {
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
  async generatePresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    // Note: R2 doesn't support presigned URLs directly
    // This would need to be implemented via a custom endpoint
    // For now, return the public URL
    return this.generateUrl(key);
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<FileType, { count: number; size: number }>;
  }> {
    const allFiles = await this.listFiles(undefined, undefined, 1000);

    const stats = {
      totalFiles: allFiles.length,
      totalSize: allFiles.reduce((sum, file) => sum + file.size, 0),
      byType: {} as Record<FileType, { count: number; size: number }>,
    };

    // Initialize all file types
    const fileTypes: FileType[] = [
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
export function createR2Storage(env: {
  R2: R2Bucket;
  BUCKET_BASE_URL: string;
}): R2Storage {
  return new R2Storage(env.R2, env.BUCKET_BASE_URL);
}

/**
 * Helper function to extract file type from content type
 */
export function getFileTypeFromContentType(contentType: string): FileType {
  if (contentType.includes("pdf")) return "resume";
  if (contentType.includes("html")) return "scraped-content";
  if (contentType.includes("json")) return "report";
  if (contentType.includes("text")) return "email-template";
  return "misc";
}

/**
 * Helper function to generate file metadata from request
 */
export function createFileMetadata(
  type: FileType,
  request: Request,
  additionalData: Partial<FileMetadata> = {}
): FileMetadata {
  const contentType =
    request.headers.get("content-type") || "application/octet-stream";
  const originalName = request.headers.get("x-original-filename") || "unknown";

  return {
    type,
    contentType,
    originalName,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };
}
