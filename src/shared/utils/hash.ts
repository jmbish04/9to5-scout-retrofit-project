/**
 * Cryptographic Hash Utilities for Cloudflare Workers
 *
 * Provides secure and efficient cryptographic hash functions and utilities using the Web Crypto API.
 * Centralizes all hash-related functionality, including SHA-256, data integrity verification,
 * and the generation of cryptographically secure random strings.
 *
 * @fileoverview This module is optimized for security, reusability, and performance in a Worker environment.
 */

// --- Type Definitions ---

type HashAlgorithm = "SHA-256" | "SHA-1" | "MD5";
type SupportedEncoding = "hex" | "base64" | "base64url";
type InputData = string | ArrayBuffer | Uint8Array;

export interface HashOptions {
  algorithm: HashAlgorithm;
  encoding: SupportedEncoding;
}

// --- Private Helper Functions ---

/**
 * Normalizes input data to a Uint8Array.
 * @param data - The input data.
 * @returns A Uint8Array representation of the data.
 */
function normalizeInput(data: InputData): Uint8Array {
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  // If it's an ArrayBuffer, convert it. If it's already a Uint8Array, this is a no-op.
  return new Uint8Array(data);
}

/**
 * Converts an ArrayBuffer to a hexadecimal string.
 * @param buffer - The buffer to convert.
 * @returns A hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts a hexadecimal string to an ArrayBuffer.
 * @param hex - The hex string to convert.
 * @returns An ArrayBuffer.
 */
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

// --- Core Hashing Function ---

/**
 * Computes a hash with custom algorithm and encoding options.
 * This is the central hashing function used by other helpers.
 *
 * @param data - The data to hash.
 * @param options - Hash configuration options.
 * @returns Promise that resolves to the hash in the specified encoding.
 */
export async function computeHash(
  data: InputData,
  options: HashOptions = { algorithm: "SHA-256", encoding: "hex" }
): Promise<string> {
  const dataBuffer = normalizeInput(data);
  const hashBuffer = await crypto.subtle.digest(options.algorithm, dataBuffer);

  switch (options.encoding) {
    case "hex":
      return bufferToHex(hashBuffer);
    case "base64":
      // btoa is available in Cloudflare Workers and browser environments
      return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    case "base64url":
      const base64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    default:
      throw new Error(`Unsupported encoding: ${options.encoding}`);
  }
}

// --- Convenience Wrapper Functions ---

/**
 * Computes the SHA-256 hash of the input data.
 * @param data - The data to hash.
 * @returns Promise resolving to the SHA-256 hash as a hex string.
 */
export async function computeSHA256(data: InputData): Promise<string> {
  return computeHash(data, { algorithm: "SHA-256", encoding: "hex" });
}

/**
 * Computes the MD5 hash. Note: MD5 is not cryptographically secure.
 * @param data - The data to hash.
 * @returns Promise resolving to the MD5 hash as a hex string.
 */
export async function computeMD5(data: InputData): Promise<string> {
  return computeHash(data, { algorithm: "MD5", encoding: "hex" });
}

/**
 * Computes the SHA-1 hash. Note: SHA-1 is not cryptographically secure.
 * @param data - The data to hash.
 * @returns Promise resolving to the SHA-1 hash as a hex string.
 */
export async function computeSHA1(data: InputData): Promise<string> {
  return computeHash(data, { algorithm: "SHA-1", encoding: "hex" });
}

// --- Utility Functions ---

/**
 * Generates a cryptographically secure random string of a given length.
 *
 * @param length - The desired length of the string (default: 32).
 * @returns A random hex string.
 *
 * @example
 * ```typescript
 * const token = generateSecureRandomString(32);
 * console.log(token); // e.g., "d8f6e9b4a2c1..."
 * ```
 */
export function generateSecureRandomString(length: number = 32): string {
  // Each byte is represented by 2 hex characters, so we need half the length in bytes.
  const byteLength = Math.ceil(length / 2);
  const randomBytes = new Uint8Array(byteLength);
  crypto.getRandomValues(randomBytes);
  return bufferToHex(randomBytes).slice(0, length);
}

/**
 * Securely verifies data integrity using a timing-safe hash comparison.
 *
 * @param data - The data to verify.
 * @param expectedHash - The expected hex-encoded hash value.
 * @param algorithm - The hash algorithm to use (default: 'SHA-256').
 * @returns Promise that resolves to true if the hash matches.
 *
 * @description Protects against timing attacks by using `crypto.subtle.timingSafeEqual`.
 *
 * @example
 * ```typescript
 * const isValid = await verifyHash("hello world", "b94d27...");
 * console.log(isValid); // true
 * ```
 */
export async function verifyHash(
  data: InputData,
  expectedHash: string,
  algorithm: HashAlgorithm = "SHA-256"
): Promise<boolean> {
  const dataBuffer = normalizeInput(data);
  const computedHashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);

  try {
    const expectedHashBuffer = hexToBuffer(expectedHash);

    // timingSafeEqual requires buffers to be the same length.
    if (computedHashBuffer.byteLength !== expectedHashBuffer.byteLength) {
      return false;
    }

    return crypto.subtle.timingSafeEqual(
      computedHashBuffer,
      expectedHashBuffer
    );
  } catch (error) {
    // This catches errors if expectedHash is not a valid hex string.
    console.error("Failed to verify hash:", error);
    return false;
  }
}
