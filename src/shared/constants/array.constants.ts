/**
 * @fileoverview Array Constants
 *
 * Shared constants for array operations across all domains.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

export const ARRAY_CONSTANTS = {
  DEFAULT_CHUNK_SIZE: 100,
  MAX_CHUNK_SIZE: 1000,
  DEFAULT_SORT_ORDER: "asc" as const,
  DEFAULT_UNIQUE: true,
  DEFAULT_COMPACT: true,
} as const;
