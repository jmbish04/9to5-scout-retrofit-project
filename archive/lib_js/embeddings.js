import { v4 as uuidv4 } from "uuid";
export class EmbeddingsManager {
    env;
    constructor(env) {
        this.env = env;
    }
    /**
     * Generate embeddings for content using Workers AI
     */
    async generateEmbedding(content) {
        try {
            const response = await this.env.AI.run(this.env.EMBEDDING_MODEL, {
                text: [content],
            });
            if (!response.data || !Array.isArray(response.data[0])) {
                throw new Error("Invalid embedding response format");
            }
            return response.data[0];
        }
        catch (error) {
            console.error("Error generating embedding:", error);
            throw new Error(`Failed to generate embedding: ${error.message}`);
        }
    }
    /**
     * Get the appropriate Vectorize index binding based on content type
     */
    getVectorizeIndex(contentType) {
        switch (contentType) {
            case "job_opening":
                return this.env.JOB_OPENINGS_INDEX;
            case "resume":
                return this.env.RESUMES_INDEX;
            case "cover_letter":
                return this.env.COVER_LETTERS_INDEX;
            case "general_content":
                return this.env.GENERAL_CONTENT_INDEX;
            default:
                throw new Error(`Unsupported content type: ${contentType}`);
        }
    }
    /**
     * Create or update an asset with embeddings
     */
    async createAssetEmbedding(asset) {
        const uuid = asset.uuid || uuidv4();
        const vectorizeIndex = this.getVectorizeIndex(asset.contentType);
        const contentHash = await this.hashContent(asset.content);
        try {
            // Check if asset already exists
            const existingAsset = await this.env.DB.prepare("SELECT * FROM asset_embeddings WHERE uuid = ? OR content_hash = ?")
                .bind(uuid, contentHash)
                .first();
            if (existingAsset) {
                // Update existing asset
                return await this.updateAssetEmbedding(uuid, asset);
            }
            // Generate embedding
            const embedding = await this.generateEmbedding(asset.content);
            // Insert into Vectorize
            const vectorId = uuid; // Use UUID as vector ID for consistency
            const metadata = {
                content_type: asset.contentType,
                uuid: uuid,
                ...asset.metadata,
            };
            await vectorizeIndex.upsert([
                {
                    id: vectorId,
                    values: embedding,
                    metadata: metadata,
                },
            ]);
            // Store in D1
            await this.env.DB.prepare(`
        INSERT INTO asset_embeddings (
          id, uuid, content_type, vectorize_index, vector_id, 
          content_hash, content_preview, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
                .bind(uuid, uuid, asset.contentType, this.getIndexName(asset.contentType), vectorId, contentHash, asset.content.substring(0, 500), JSON.stringify(metadata))
                .run();
            // Log the operation
            await this.logEmbeddingOperation(uuid, "create", "completed", this.getIndexName(asset.contentType), vectorId);
            return {
                uuid,
                vectorId,
                vectorizeIndex: this.getIndexName(asset.contentType),
                success: true,
            };
        }
        catch (error) {
            console.error("Error creating asset embedding:", error);
            await this.logEmbeddingOperation(uuid, "create", "failed", this.getIndexName(asset.contentType), null, error.message);
            return {
                uuid,
                vectorId: "",
                vectorizeIndex: this.getIndexName(asset.contentType),
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Update an existing asset embedding
     */
    async updateAssetEmbedding(uuid, asset) {
        const vectorizeIndex = this.getVectorizeIndex(asset.contentType);
        const contentHash = await this.hashContent(asset.content);
        try {
            // Generate new embedding
            const embedding = await this.generateEmbedding(asset.content);
            // Update in Vectorize
            const metadata = {
                content_type: asset.contentType,
                uuid: uuid,
                ...asset.metadata,
            };
            await vectorizeIndex.upsert([
                {
                    id: uuid,
                    values: embedding,
                    metadata: metadata,
                },
            ]);
            // Update in D1
            await this.env.DB.prepare(`
        UPDATE asset_embeddings 
        SET content_hash = ?, content_preview = ?, metadata_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ?
      `)
                .bind(contentHash, asset.content.substring(0, 500), JSON.stringify(metadata), uuid)
                .run();
            await this.logEmbeddingOperation(uuid, "update", "completed", this.getIndexName(asset.contentType), uuid);
            return {
                uuid,
                vectorId: uuid,
                vectorizeIndex: this.getIndexName(asset.contentType),
                success: true,
            };
        }
        catch (error) {
            console.error("Error updating asset embedding:", error);
            await this.logEmbeddingOperation(uuid, "update", "failed", this.getIndexName(asset.contentType), null, error.message);
            return {
                uuid,
                vectorId: "",
                vectorizeIndex: this.getIndexName(asset.contentType),
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Delete an asset embedding
     */
    async deleteAssetEmbedding(uuid, contentType) {
        const vectorizeIndex = this.getVectorizeIndex(contentType);
        try {
            // Delete from Vectorize
            await vectorizeIndex.deleteByIds([uuid]);
            // Delete from D1
            await this.env.DB.prepare("DELETE FROM asset_embeddings WHERE uuid = ?")
                .bind(uuid)
                .run();
            await this.logEmbeddingOperation(uuid, "delete", "completed", this.getIndexName(contentType), uuid);
            return {
                uuid,
                vectorId: uuid,
                vectorizeIndex: this.getIndexName(contentType),
                success: true,
            };
        }
        catch (error) {
            console.error("Error deleting asset embedding:", error);
            await this.logEmbeddingOperation(uuid, "delete", "failed", this.getIndexName(contentType), null, error.message);
            return {
                uuid,
                vectorId: "",
                vectorizeIndex: this.getIndexName(contentType),
                success: false,
                error: error.message,
            };
        }
    }
    /**
     * Perform RAG query
     */
    async performRAGQuery(ragQuery) {
        try {
            // Generate embedding for the query
            const queryEmbedding = await this.generateEmbedding(ragQuery.query);
            const vectorizeIndex = this.getVectorizeIndex(ragQuery.vectorizeIndex);
            // Perform vector search
            const searchResults = await vectorizeIndex.query(queryEmbedding, {
                topK: ragQuery.limit || 10,
                filter: ragQuery.filters,
            });
            // Store query in database
            const queryId = uuidv4();
            await this.env.DB.prepare(`
        INSERT INTO rag_queries (
          id, query_text, query_embedding_json, vectorize_index, 
          results_json, user_id, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
                .bind(queryId, ragQuery.query, JSON.stringify(queryEmbedding), ragQuery.vectorizeIndex, JSON.stringify(searchResults), ragQuery.userId || null, ragQuery.sessionId || null)
                .run();
            // Build context from results
            const context = this.buildContextFromResults(searchResults);
            return {
                results: searchResults,
                queryId,
                context,
            };
        }
        catch (error) {
            console.error("Error performing RAG query:", error);
            throw new Error(`RAG query failed: ${error.message}`);
        }
    }
    /**
     * Search for similar content by UUID
     */
    async searchByUUID(uuid, limit = 10) {
        try {
            // Get the asset to find its content type
            const asset = await this.env.DB.prepare("SELECT * FROM asset_embeddings WHERE uuid = ?")
                .bind(uuid)
                .first();
            if (!asset) {
                throw new Error("Asset not found");
            }
            // Get the content to generate embedding
            const content = await this.getAssetContent(uuid);
            if (!content) {
                throw new Error("Asset content not found");
            }
            // Generate embedding and search
            const embedding = await this.generateEmbedding(content);
            const vectorizeIndex = this.getVectorizeIndex(asset.content_type);
            const results = await vectorizeIndex.query(embedding, {
                topK: limit + 1, // +1 to exclude the original
                filter: {
                    content_type: asset.content_type,
                },
            });
            // Filter out the original asset
            return results.filter((result) => result.id !== uuid);
        }
        catch (error) {
            console.error("Error searching by UUID:", error);
            throw new Error(`Search by UUID failed: ${error.message}`);
        }
    }
    /**
     * Get asset content by UUID (implement based on your storage strategy)
     */
    async getAssetContent(uuid) {
        // This should be implemented based on how you store content
        // For now, return the content_preview
        const asset = await this.env.DB.prepare("SELECT content_preview FROM asset_embeddings WHERE uuid = ?")
            .bind(uuid)
            .first();
        return asset?.content_preview || null;
    }
    /**
     * Build context string from search results
     */
    buildContextFromResults(results) {
        return results
            .map((result, index) => {
            const metadata = result.metadata || {};
            const preview = metadata.content_preview || "No preview available";
            return `[${index + 1}] ${preview}`;
        })
            .join("\n\n");
    }
    /**
     * Hash content for deduplication
     */
    async hashContent(content) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    /**
     * Get index name for content type
     */
    getIndexName(contentType) {
        switch (contentType) {
            case "job_opening":
                return "job-openings";
            case "resume":
                return "resumes";
            case "cover_letter":
                return "cover-letters";
            case "general_content":
                return "general-content";
            default:
                throw new Error(`Unsupported content type: ${contentType}`);
        }
    }
    /**
     * Log embedding operation
     */
    async logEmbeddingOperation(assetUuid, operationType, status, vectorizeIndex, vectorId, errorMessage) {
        const operationId = uuidv4();
        await this.env.DB.prepare(`
      INSERT INTO embedding_operations (
        id, asset_uuid, operation_type, status, error_message,
        vectorize_index, vector_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
            .bind(operationId, assetUuid, operationType, status, errorMessage || null, vectorizeIndex, vectorId)
            .run();
    }
}
