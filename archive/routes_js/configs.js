/**
 * Configurations API routes for managing search configurations.
 */
import { getSearchConfigs, saveSearchConfig } from "../lib/storage";
export async function handleConfigsGet(request, env) {
    try {
        const configs = await getSearchConfigs(env);
        return new Response(JSON.stringify(configs), {
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error fetching configs:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch configurations" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
export async function handleConfigsPost(request, env) {
    try {
        const body = (await request.json());
        // Validate required fields
        if (!body.name || !body.keywords) {
            return new Response(JSON.stringify({ error: "Name and keywords are required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        const config = {
            id: body.id || crypto.randomUUID(),
            name: body.name,
            keywords: body.keywords,
            locations: body.locations,
            include_domains: body.include_domains,
            exclude_domains: body.exclude_domains,
            min_comp_total: body.min_comp_total,
        };
        const configId = await saveSearchConfig(env, config);
        return new Response(JSON.stringify({ id: configId }), {
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error saving config:", error);
        return new Response(JSON.stringify({ error: "Failed to save configuration" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
