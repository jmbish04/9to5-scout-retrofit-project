// src/lib/r2-utils.ts

/**
 * Constructs the full public URL for an R2 object.
 * Assumes the R2 bucket is configured for public access and its URL is available in the environment.
 *
 * @param r2PublicUrl The base public URL of the R2 bucket (e.g., https://your-r2-bucket.workers.dev).
 * @param objectKey The key (path) of the object within the R2 bucket (e.g., 'assets/logo.png').
 * @returns The full public URL of the R2 object.
 */
export function getR2ObjectUrl(r2PublicUrl: string, objectKey: string): string {
    // Ensure the base URL ends with a slash and the object key doesn't start with one
    const baseUrl = r2PublicUrl.endsWith('/') ? r2PublicUrl : `${r2PublicUrl}/`;
    const key = objectKey.startsWith('/') ? objectKey.substring(1) : objectKey;
    return `${baseUrl}${key}`;
}
