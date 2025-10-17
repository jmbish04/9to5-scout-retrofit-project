import { EmbeddingAsset, EmbeddingsManager } from "../lib/embeddings";

export async function handleCreateEmbedding(request: Request, env: any) {
  try {
    const body = (await request.json()) as any;
    const { content, contentType, metadata, uuid } = body;

    if (!content || !contentType) {
      return new Response(
        JSON.stringify({ error: "content and contentType are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validContentTypes = [
      "job_opening",
      "resume",
      "cover_letter",
      "general_content",
    ];
    if (!validContentTypes.includes(contentType)) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid contentType. Must be one of: " +
            validContentTypes.join(", "),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const embeddingsManager = new EmbeddingsManager(env);
    const asset: EmbeddingAsset = {
      uuid,
      content,
      contentType,
      metadata,
    };

    const result = await embeddingsManager.createAssetEmbedding(asset);

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          message: "Embedding created successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          message: "Failed to create embedding",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    console.error("Error creating embedding:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleUpdateEmbedding(
  request: Request,
  env: any,
  uuid: string
) {
  try {
    const body = (await request.json()) as any;
    const { content, contentType, metadata } = body;

    if (!content || !contentType) {
      return new Response(
        JSON.stringify({ error: "content and contentType are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const embeddingsManager = new EmbeddingsManager(env);
    const asset: EmbeddingAsset = {
      uuid,
      content,
      contentType,
      metadata,
    };

    const result = await embeddingsManager.updateAssetEmbedding(uuid, asset);

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          message: "Embedding updated successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          message: "Failed to update embedding",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    console.error("Error updating embedding:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleDeleteEmbedding(
  request: Request,
  env: any,
  uuid: string
) {
  try {
    const url = new URL(request.url);
    const contentType = url.searchParams.get("contentType");

    if (!contentType) {
      return new Response(
        JSON.stringify({ error: "contentType query parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const embeddingsManager = new EmbeddingsManager(env);
    const result = await embeddingsManager.deleteAssetEmbedding(
      uuid,
      contentType
    );

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          message: "Embedding deleted successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          message: "Failed to delete embedding",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    console.error("Error deleting embedding:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleSearchEmbeddings(request: Request, env: any) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query");
    const contentType = url.searchParams.get("contentType");
    const limit = url.searchParams.get("limit");
    const filters = url.searchParams.get("filters");

    if (!query) {
      return new Response(
        JSON.stringify({ error: "query parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const embeddingsManager = new EmbeddingsManager(env);
    const ragQuery = {
      query,
      vectorizeIndex: contentType || "job_opening",
      limit: limit ? parseInt(limit) : 10,
      filters: filters ? JSON.parse(filters) : undefined,
    };

    const result = await embeddingsManager.performRAGQuery(ragQuery);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        message: "Search completed successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error searching embeddings:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Search failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleSearchByUUID(
  request: Request,
  env: any,
  uuid: string
) {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit");

    const embeddingsManager = new EmbeddingsManager(env);
    const results = await embeddingsManager.searchByUUID(
      uuid,
      limit ? parseInt(limit) : 10
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        message: "Similar content found",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error searching by UUID:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Search failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleGetEmbeddingStats(request: Request, env: any) {
  try {
    const url = new URL(request.url);
    const contentType = url.searchParams.get("contentType");

    let query = `
      SELECT 
        content_type,
        COUNT(*) as total_embeddings,
        COUNT(DISTINCT uuid) as unique_assets,
        MIN(created_at) as oldest_embedding,
        MAX(created_at) as newest_embedding
      FROM asset_embeddings
    `;

    const params = [];
    if (contentType) {
      query += " WHERE content_type = ?";
      params.push(contentType);
    }

    query += " GROUP BY content_type ORDER BY content_type";

    const stats = await env.DB.prepare(query)
      .bind(...params)
      .all();

    // Get operation stats
    const operationStats = await env.DB.prepare(
      `
      SELECT 
        operation_type,
        status,
        COUNT(*) as count
      FROM embedding_operations
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY operation_type, status
      ORDER BY operation_type, status
    `
    ).all();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          embeddings: stats.results,
          operations: operationStats.results,
        },
        message: "Stats retrieved successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error getting embedding stats:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Failed to get stats",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleGetEmbeddingOperations(request: Request, env: any) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");

    let query = `
      SELECT 
        eo.*,
        ae.content_preview,
        ae.content_type
      FROM embedding_operations eo
      LEFT JOIN asset_embeddings ae ON eo.asset_uuid = ae.uuid
    `;

    const params = [];
    const conditions = [];

    if (status) {
      conditions.push("eo.status = ?");
      params.push(status);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY eo.created_at DESC";

    if (limit) {
      query += " LIMIT ?";
      params.push(parseInt(limit));
    }

    if (offset) {
      query += " OFFSET ?";
      params.push(parseInt(offset));
    }

    const operations = await env.DB.prepare(query)
      .bind(...params)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        data: operations.results,
        message: "Operations retrieved successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error getting embedding operations:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Failed to get operations",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
