/**
 * R2 Storage Service
 *
 * High-level service for R2 storage operations with business logic and error handling.
 * Provides a clean interface for file operations across the application.
 *
 * @fileoverview This module provides a service layer for R2 storage operations,
 * including file upload, download, deletion, and metadata management.
 */

import { R2Storage, createR2Storage, type R2File } from "./r2-client";

export interface R2StorageServiceEnv {
  R2: R2Bucket;
  BUCKET_BASE_URL: string;
}

export class R2StorageService {
  private r2Storage: R2Storage;

  constructor(env: R2StorageServiceEnv) {
    this.r2Storage = createR2Storage({
      R2: env.R2,
      BUCKET_BASE_URL: env.BUCKET_BASE_URL,
    });
  }

  /**
   * Upload a file to R2 storage
   */
  async uploadFile(file: ArrayBuffer, metadata: any): Promise<any> {
    return this.r2Storage.uploadFile(file, metadata);
  }

  /**
   * Download a file from R2 storage
   */
  async downloadFile(key: string): Promise<ArrayBuffer | null> {
    const file = await this.r2Storage.getFile(key);
    if (!file || !("body" in file)) return null;
    return await (file as any).arrayBuffer();
  }

  /**
   * Delete a file from R2 storage
   */
  async deleteFile(key: string): Promise<void> {
    return this.r2Storage.deleteFile(key);
  }

  /**
   * List files with optional filtering
   */
  async listFiles(
    prefix?: string,
    limit?: number,
    cursor?: string
  ): Promise<{ files: R2File[]; cursor?: string }> {
    const files = await this.r2Storage.listFiles();
    return {
      files: files || [],
      cursor: undefined,
    };
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<any | null> {
    return this.r2Storage.getFileMetadata(key);
  }

  /**
   * Generate a presigned URL for file access
   */
  async generatePresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string | null> {
    return this.r2Storage.generatePresignedUrl(key, expiresIn);
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    const file = await this.r2Storage.getFile(key);
    return file !== null;
  }

  /**
   * Get file size
   */
  async getFileSize(key: string): Promise<number | null> {
    const file = await this.r2Storage.getFile(key);
    return file?.size || null;
  }
}

/**
 * Create an R2 storage service instance
 */
export function createR2StorageService(
  env: R2StorageServiceEnv
): R2StorageService {
  return new R2StorageService(env);
}
