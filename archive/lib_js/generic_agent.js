/**
 * GenericAgent - A Cloudflare Agents SDK implementation
 *
 * This agent loads its configuration from the D1 database and can execute
 * various AI tasks based on the agent_configs table. It provides a unified
 * interface for all agent types defined in the YAML configuration files.
 */
import { Agent } from "agents";
export class GenericAgent extends Agent {
    // Initial state for the agent
    initialState = {
        currentAgent: null,
        sessionId: null,
        lastActivity: Date.now(),
        conversationHistory: [],
    };
    // Called when a new Agent instance starts or wakes from hibernation
    async onStart() {
        console.log("GenericAgent started with state:", this.state);
        this.state.lastActivity = Date.now();
    }
    // Handle HTTP requests coming to this Agent instance
    async onRequest(request) {
        const url = new URL(request.url);
        try {
            switch (url.pathname) {
                case "/run":
                    return await this.handleRunRequest(request);
                case "/agents":
                    return await this.handleListAgents();
                case "/tasks":
                    return await this.handleListTasks(request);
                case "/health":
                    return new Response(JSON.stringify({ status: "healthy", timestamp: Date.now() }), {
                        headers: { "Content-Type": "application/json" },
                    });
                default:
                    return new Response("Not found", { status: 404 });
            }
        }
        catch (error) {
            console.error("Error in onRequest:", error);
            return new Response(JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }
    // Handle WebSocket connections for real-time communication
    async onWebSocket(ws, request) {
        ws.addEventListener("message", async (event) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case "run_agent":
                        const result = await this.runAgent(data.agentName, data.prompt, data.sessionId);
                        ws.send(JSON.stringify({
                            type: "agent_response",
                            data: result,
                            timestamp: Date.now(),
                        }));
                        break;
                    case "list_agents":
                        const agents = await this.getAvailableAgents();
                        ws.send(JSON.stringify({
                            type: "agents_list",
                            data: agents,
                            timestamp: Date.now(),
                        }));
                        break;
                    default:
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Unknown message type",
                            timestamp: Date.now(),
                        }));
                }
            }
            catch (error) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: error instanceof Error ? error.message : String(error),
                    timestamp: Date.now(),
                }));
            }
        });
    }
    // Main method for running an agent task
    async runAgent(agentName, prompt, sessionId) {
        try {
            // Update state
            this.state.currentAgent = agentName;
            this.state.sessionId = sessionId || "default-session";
            this.state.lastActivity = Date.now();
            // Add user message to conversation history
            this.state.conversationHistory.push({
                role: "user",
                content: prompt,
                timestamp: Date.now(),
            });
            // 1. Fetch the agent's configuration from D1
            const agentConfig = await this.getAgentConfig(agentName);
            if (!agentConfig) {
                throw new Error(`Agent configuration for '${agentName}' not found in the database.`);
            }
            // 2. Construct the final system prompt from the D1 record
            const systemPrompt = agentConfig.system_prompt || this.buildSystemPrompt(agentConfig);
            // 3. Prepare messages for AI call
            const messages = [
                { role: "system", content: systemPrompt },
                ...this.state.conversationHistory.slice(-10), // Keep last 10 messages for context
                { role: "user", content: prompt },
            ];
            // 4. Execute the AI call using the loaded configuration
            const response = await this.env.AI.run(agentConfig.llm, {
                messages,
                max_tokens: agentConfig.max_tokens,
                temperature: agentConfig.temperature,
            });
            // 5. Add assistant response to conversation history
            const responseText = typeof response === "string"
                ? response
                : response?.response ||
                    response?.text ||
                    JSON.stringify(response);
            this.state.conversationHistory.push({
                role: "assistant",
                content: responseText,
                timestamp: Date.now(),
            });
            return {
                agent: agentName,
                response: responseText,
                metadata: {
                    model: agentConfig.llm,
                    tokens_used: response?.usage?.total_tokens || 0,
                    timestamp: Date.now(),
                },
            };
        }
        catch (error) {
            console.error(`Error running agent ${agentName}:`, error);
            throw error instanceof Error ? error : new Error(String(error));
        }
    }
    // Get agent configuration from D1
    async getAgentConfig(agentName) {
        const stmt = this.env.DB.prepare(`
      SELECT id, name, role, goal, backstory, llm, system_prompt, 
             max_tokens, temperature, enabled
      FROM agent_configs 
      WHERE name = ? AND enabled = 1
    `);
        const result = await stmt.bind(agentName).first();
        return result;
    }
    // Get all available agents
    async getAvailableAgents() {
        const stmt = this.env.DB.prepare(`
      SELECT id, name, role, goal, backstory, llm, system_prompt, 
             max_tokens, temperature, enabled
      FROM agent_configs 
      WHERE enabled = 1
      ORDER BY name
    `);
        const result = await stmt.all();
        return result.results;
    }
    // Get tasks for a specific agent
    async getTasksForAgent(agentId) {
        const stmt = this.env.DB.prepare(`
      SELECT id, name, description, expected_output, agent_id, 
             context_tasks, output_schema, enabled
      FROM task_configs 
      WHERE agent_id = ? AND enabled = 1
      ORDER BY name
    `);
        const result = await stmt.bind(agentId).all();
        return result.results;
    }
    // Build system prompt from agent configuration
    buildSystemPrompt(config) {
        return `You are an AI assistant with the following characteristics:

Role: ${config.role}

Goal: ${config.goal}

Backstory: ${config.backstory}

Please respond to the user's request in character, staying true to your role and expertise.`;
    }
    // HTTP handlers
    async handleRunRequest(request) {
        const { agentName, prompt, sessionId } = (await request.json());
        const result = await this.runAgent(agentName, prompt, sessionId);
        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
        });
    }
    async handleListAgents() {
        const agents = await this.getAvailableAgents();
        return new Response(JSON.stringify(agents), {
            headers: { "Content-Type": "application/json" },
        });
    }
    async handleListTasks(request) {
        const url = new URL(request.url);
        const agentId = url.searchParams.get("agent_id");
        if (!agentId) {
            return new Response(JSON.stringify({ error: "agent_id parameter required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        const tasks = await this.getTasksForAgent(agentId);
        return new Response(JSON.stringify(tasks), {
            headers: { "Content-Type": "application/json" },
        });
    }
    // Utility method to clear conversation history
    async clearHistory() {
        this.state.conversationHistory = [];
        this.state.currentAgent = null;
        this.state.lastActivity = Date.now();
    }
    // Utility method to get conversation summary
    async getConversationSummary() {
        return {
            currentAgent: this.state.currentAgent,
            sessionId: this.state.sessionId,
            messageCount: this.state.conversationHistory.length,
            lastActivity: this.state.lastActivity,
            recentMessages: this.state.conversationHistory.slice(-5),
        };
    }
}
