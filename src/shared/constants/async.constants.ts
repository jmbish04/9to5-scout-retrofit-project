/**
 * @fileoverview Async Constants
 *
 * Shared constants for async operations across all domains.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

export const ASYNC_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 30000,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY_MS: 1000,
  DEFAULT_CONCURRENCY_LIMIT: 10,
  DEFAULT_BATCH_SIZE: 100,
} as const;
