/**
 * @fileoverview Object Constants
 *
 * Shared constants for object operations across all domains.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

export const OBJECT_CONSTANTS = {
  DEFAULT_DEEP_CLONE: true,
  DEFAULT_MERGE_STRATEGY: "deep" as const,
  DEFAULT_COMPARE_STRATEGY: "shallow" as const,
} as const;
