import { RAGAgent } from "../lib/rag_agent";
export async function handleRAGQuery(request, env) {
    try {
        const body = (await request.json());
        const { question, contextTypes, userId, sessionId } = body;
        if (!question) {
            return new Response(JSON.stringify({ error: "question is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Get or create RAG agent
        const agentId = env.RAG_AGENT.idFromName("main-rag-agent");
        const agent = env.RAG_AGENT.get(agentId);
        const ragAgent = new RAGAgent(agent, env);
        const answer = await ragAgent.answerQuestion(question, contextTypes || ["job_opening", "resume", "cover_letter"]);
        return new Response(JSON.stringify({
            success: true,
            data: {
                question,
                answer,
                contextTypes: contextTypes || [
                    "job_opening",
                    "resume",
                    "cover_letter",
                ],
                timestamp: new Date().toISOString(),
            },
            message: "RAG query completed successfully",
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error processing RAG query:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: "RAG query failed",
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleFindSimilarJobs(request, env) {
    try {
        const body = (await request.json());
        const { jobDescription, limit } = body;
        if (!jobDescription) {
            return new Response(JSON.stringify({ error: "jobDescription is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        const agentId = env.RAG_AGENT.idFromName("main-rag-agent");
        const agent = env.RAG_AGENT.get(agentId);
        const ragAgent = new RAGAgent(agent, env);
        const similarJobs = await ragAgent.findSimilarJobs(jobDescription, limit || 10);
        return new Response(JSON.stringify({
            success: true,
            data: {
                query: jobDescription,
                results: similarJobs,
                count: similarJobs.length,
                timestamp: new Date().toISOString(),
            },
            message: "Similar jobs found successfully",
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error finding similar jobs:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: "Failed to find similar jobs",
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleFindMatchingResumes(request, env) {
    try {
        const body = (await request.json());
        const { jobDescription, limit } = body;
        if (!jobDescription) {
            return new Response(JSON.stringify({ error: "jobDescription is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        const agentId = env.RAG_AGENT.idFromName("main-rag-agent");
        const agent = env.RAG_AGENT.get(agentId);
        const ragAgent = new RAGAgent(agent, env);
        const matchingResumes = await ragAgent.findMatchingResumes(jobDescription, limit || 10);
        return new Response(JSON.stringify({
            success: true,
            data: {
                query: jobDescription,
                results: matchingResumes,
                count: matchingResumes.length,
                timestamp: new Date().toISOString(),
            },
            message: "Matching resumes found successfully",
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error finding matching resumes:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: "Failed to find matching resumes",
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleGenerateCoverLetterSuggestions(request, env) {
    try {
        const body = (await request.json());
        const { jobDescription, resumeContent } = body;
        if (!jobDescription || !resumeContent) {
            return new Response(JSON.stringify({
                error: "jobDescription and resumeContent are required",
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        const agentId = env.RAG_AGENT.idFromName("main-rag-agent");
        const agent = env.RAG_AGENT.get(agentId);
        const ragAgent = new RAGAgent(agent, env);
        const suggestions = await ragAgent.generateCoverLetterSuggestions(jobDescription, resumeContent);
        return new Response(JSON.stringify({
            success: true,
            data: {
                suggestions,
                timestamp: new Date().toISOString(),
            },
            message: "Cover letter suggestions generated successfully",
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error generating cover letter suggestions:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: "Failed to generate cover letter suggestions",
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleGetJobMarketInsights(request, env) {
    try {
        const url = new URL(request.url);
        const query = url.searchParams.get("query");
        if (!query) {
            return new Response(JSON.stringify({ error: "query parameter is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        const agentId = env.RAG_AGENT.idFromName("main-rag-agent");
        const agent = env.RAG_AGENT.get(agentId);
        const ragAgent = new RAGAgent(agent, env);
        const insights = await ragAgent.getJobMarketInsights(query);
        return new Response(JSON.stringify({
            success: true,
            data: {
                query,
                insights,
                timestamp: new Date().toISOString(),
            },
            message: "Job market insights generated successfully",
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error getting job market insights:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: "Failed to get job market insights",
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleSearchAllContent(request, env) {
    try {
        const url = new URL(request.url);
        const query = url.searchParams.get("query");
        const limit = url.searchParams.get("limit");
        if (!query) {
            return new Response(JSON.stringify({ error: "query parameter is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        const agentId = env.RAG_AGENT.idFromName("main-rag-agent");
        const agent = env.RAG_AGENT.get(agentId);
        const ragAgent = new RAGAgent(agent, env);
        const results = await ragAgent.searchAllContent(query, limit ? parseInt(limit) : 10);
        return new Response(JSON.stringify({
            success: true,
            data: {
                query,
                results,
                totalResults: results.reduce((sum, r) => sum + r.results.length, 0),
                timestamp: new Date().toISOString(),
            },
            message: "Search completed successfully",
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error searching all content:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: "Search failed",
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleGetRAGAnalytics(request, env) {
    try {
        const url = new URL(request.url);
        const timeframe = url.searchParams.get("timeframe");
        const agentId = env.RAG_AGENT.idFromName("main-rag-agent");
        const agent = env.RAG_AGENT.get(agentId);
        const ragAgent = new RAGAgent(agent, env);
        const analytics = await ragAgent.getAnalytics(timeframe || "7d");
        return new Response(JSON.stringify({
            success: true,
            data: analytics,
            message: "Analytics retrieved successfully",
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error getting RAG analytics:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: "Failed to get analytics",
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleGetRAGQueries(request, env) {
    try {
        const url = new URL(request.url);
        const userId = url.searchParams.get("userId");
        const sessionId = url.searchParams.get("sessionId");
        const limit = url.searchParams.get("limit");
        const offset = url.searchParams.get("offset");
        let query = `
      SELECT 
        rq.*,
        COUNT(ari.id) as interaction_count
      FROM rag_queries rq
      LEFT JOIN agent_rag_interactions ari ON rq.id = ari.query_id
    `;
        const params = [];
        const conditions = [];
        if (userId) {
            conditions.push("rq.user_id = ?");
            params.push(userId);
        }
        if (sessionId) {
            conditions.push("rq.session_id = ?");
            params.push(sessionId);
        }
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }
        query += " GROUP BY rq.id ORDER BY rq.created_at DESC";
        if (limit) {
            query += " LIMIT ?";
            params.push(parseInt(limit));
        }
        if (offset) {
            query += " OFFSET ?";
            params.push(parseInt(offset));
        }
        const queries = await env.DB.prepare(query)
            .bind(...params)
            .all();
        return new Response(JSON.stringify({
            success: true,
            data: queries.results,
            message: "RAG queries retrieved successfully",
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error getting RAG queries:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: "Failed to get RAG queries",
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
