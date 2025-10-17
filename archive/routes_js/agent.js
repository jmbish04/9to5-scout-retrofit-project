/**
 * Agent API route for semantic search and job querying.
 */
import { embedText } from "../lib/ai";
export async function handleAgentQuery(request, env) {
    try {
        const url = new URL(request.url);
        const query = url.searchParams.get("q");
        if (!query) {
            return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Generate embedding for the query
        const queryEmbedding = await embedText(env, query);
        if (!queryEmbedding) {
            return new Response(JSON.stringify({ error: "Failed to generate query embedding" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Search for similar jobs using Vectorize
        const searchResults = await env.VECTORIZE_INDEX.query(queryEmbedding, {
            topK: 10,
            returnMetadata: true,
        });
        // Get job details for the matching IDs
        const jobIds = searchResults.matches?.map((match) => match.id) || [];
        if (jobIds.length === 0) {
            return new Response(JSON.stringify({ jobs: [], query }), {
                headers: { "Content-Type": "application/json" },
            });
        }
        // Fetch job details from database
        const placeholders = jobIds.map(() => "?").join(",");
        const stmt = env.DB.prepare(`SELECT * FROM jobs WHERE id IN (${placeholders})`);
        const result = await stmt.bind(...jobIds).all();
        const jobs = result.results || [];
        // Add similarity scores to jobs
        const jobsWithScores = jobs.map((job) => {
            const match = searchResults.matches?.find((m) => m.id === job.id);
            return {
                ...job,
                similarity_score: match?.score || 0,
            };
        });
        // Sort by similarity score
        jobsWithScores.sort((a, b) => b.similarity_score - a.similarity_score);
        return new Response(JSON.stringify({
            jobs: jobsWithScores,
            query,
            total_results: jobsWithScores.length,
        }), {
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error processing agent query:", error);
        return new Response(JSON.stringify({ error: "Failed to process query" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
