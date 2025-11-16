/**
 * @module src/types.ts
 * @description
 * Environment and shared type definitions.
 */

import type { AIEnv } from "./utils/ai";
import type { DatabaseEnv } from "./utils/db";

export interface Env extends DatabaseEnv, AIEnv {
  // Durable Objects
  ROOM_DO: DurableObjectNamespace<any>;

  // Other bindings from existing project
  KV?: KVNamespace;
  R2?: R2Bucket;
  VECTORIZE_INDEX?: VectorizeIndex;
  MYBROWSER?: Fetcher;
  ASSETS?: Fetcher;
  BUCKET_BASE_URL?: string;
  WORKER_API_KEY?: string;

  // AI Models
  DEFAULT_MODEL_WEB_BROWSER?: string;
  DEFAULT_MODEL_REASONING?: string;
  EMBEDDING_MODEL?: string;
}

export type { AIEnv, DatabaseEnv };
